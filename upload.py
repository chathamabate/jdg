import os
import shutil
import json
import datetime as dt
from collections import defaultdict

import bitdotio 
from psycopg2.extras import execute_values

# Each file of found in the "new_data" directory 
# will be uploaded and then moved into the "old_data directory".
#
# creds.json is a file which is required and gives the credentials
# for what postgres db and table to upload to.
# creds.json must have entries for verification and entries for
# table names...
# The verification entries are "username", "password", and "db".
# The table name entries are "players", "games", "rosters", and "turns".

DIR_PATH = os.path.dirname(os.path.abspath(__file__))
OLD_DATA_PATH = os.path.join(DIR_PATH, "old_data")
NEW_DATA_PATH = os.path.join(DIR_PATH, "new_data")
CREDS_PATH = os.path.join(DIR_PATH, "creds.json")

# Fields which must be present in creds.json.
REQ_CREDS_FIELDS = [
    "api_key",
    "players", "games", "rosters", "turns"
]

# I am assuming these players are static.
# i.e. they will not be changing throughout the course of the league.
PLAYER_IDS = {
    "Chatham" : 0,
    "Josh" : 1,
    "Mary" : 2,
    "Megan" : 3,
    "Robert" : 4,
    "Nathan" : 5,
    "Anastasia" : 6,
    "Alyson" : 7
}

DATE_PATTERN = "%m/%d/%Y %I:%M %p"


# Function for processing the turns data of a game.
def process_turns(data_lines):
    results = [[pos, round_num, -1, -1] 
                for round_num in range(1, 26)
                for pos in range(4)]

    error_lines = defaultdict(list)

    # The next 25 will be read as turn lines.
    for round_ind in range(1, 26):
        expected_card_total = round_ind if round_ind <= 13 else 26 - round_ind

        line = data_lines[round_ind - 1]
        args = line.split(",")
        # First get the results... then get the
        try:
            card_total = int(args[0])

            # Confirm card amount is correct for given round.
            if card_total != expected_card_total:
                error_lines[round_ind].append(f"Invalid card amount ({card_total})")
                continue
            
            bet_total = 0
            earned_total = 0

            for i in range(4):
                bet = int(args[4 + i*3])
                if bet < 0 or expected_card_total < bet:
                    error_lines[round_ind].append(
                        f"Invalid bet (Player {i}, Bet {bet})"
                    )

                earned = int(args[5 + i*3])
                if earned < 0 or expected_card_total < earned:
                    error_lines[round_ind].append(
                        f"Invalid earned (Player {i}, Earned {earned})"
                    )

                bet_total += bet
                earned_total += earned

                ind = (round_ind - 1)*4 + i

                results[ind][2] = bet
                results[ind][3] = earned
            
            if bet_total == card_total:
                error_lines[round_ind].append(f"Invalid betting total ({bet_total})")
            
            if earned_total != card_total:
                error_lines[round_ind].append(f"Invalid earned total ({earned_total})")

        except:
            error_lines[round_ind].append("Error while parsing line")

    return results, error_lines


def construct_new_game(curr, games_table, game_start, league_match, loc):
    # First, get the maximum id in use currently.
    max_query = f"""
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0 
            ELSE MAX(gid) + 1 
        END 
    FROM {games_table};"""

    gid = -1

    try:
        curr.execute(max_query)
        top_row = curr.fetchone()
        gid = top_row[0]
    except:
         return -1, "Could not fetch max gid"

    insert_query = f"""
    INSERT INTO {games_table} (gid, league_match, game_start, loc)
    VALUES ({gid}, {league_match}, \'{game_start}\', \'{loc}\');
    """

    try:
        curr.execute(insert_query)
    except:
        return -1, "Could not insert new game"

    return gid, None


def insert_rosters(curr, rosters_table, gid, pids):
    if len(pids) != 4:
        return "Incorrect number of players given"

    insert_query = f"""
    INSERT INTO {rosters_table} (gid, pos, pid)
    VALUES %s;
    """

    rows = [(gid, pos, pids[pos]) for pos in range(4)]

    try:
        execute_values(curr, insert_query, rows)
    except:
        return "Could not insert roster"
    
    return None


def insert_turns(curr, turns_table, gid, turns_data):
    insert_query = f"""
    INSERT INTO {turns_table} (gid, pos, round_num, bet, earned)
    VALUES %s;
    """
    rows = [(gid, t[0], t[1], t[2], t[3]) for t in turns_data]

    try:
        execute_values(curr, insert_query, rows)
    except:
        return "Could not insert turns"
    
    return None


creds = None

# First attempt to load credentials...
try:
    creds_f = open(CREDS_PATH, "r")
    creds = json.load(creds_f)
    creds_f.close()
except:
    print("Cannot locate creds.json")
    exit(1)

missing_creds = [field  for field in REQ_CREDS_FIELDS 
                        if field not in creds]

# Verify credentials.
if len(missing_creds) > 0:
    print(f"Fields missing in creds.json {missing_creds}")
    exit(1)

curr = None
try:
    b = bitdotio.bitdotio(creds["api_key"])
    conn = b.get_connection()
    curr = conn.cursor()
except:
    print("Unable to construct cursor into database")
    exit(1)

# All new_data files to check.
new_data_files = os.listdir(NEW_DATA_PATH)

for df in new_data_files:
    print(f"> {df}")
    lines = []

    abs_path = os.path.join(NEW_DATA_PATH, df)

    # This file should always exist. (extract its lines)
    with open(abs_path, "r") as f:
        lines = [line[:-1] for line in f.readlines()]

    # The file should have no less than 30 lines.
    if len(lines) < 30:
        print(f"  Too few lines in file ({len(lines)})")
        continue
    
    match_dt = None
    try:
        match_dt = dt.datetime.strptime(lines[0], DATE_PATTERN)
    except:
        print(f"  Bad date header ({lines[0]})")
        continue

    league_match = lines[1].startswith("true")
    location = lines[2]

    pids = [-1, -1, -1, -1]
    try:
        names = lines[4].split(",")
        for i in range(4):
            name = names[i*3 + 3]
            pids[i] = PLAYER_IDS[name]
    except:
        print("  Error parsing player names header")
        continue

    # Toss first five lines now that header has been processed.
    # Time to parse the actual turn data.
    lines = lines[5:]
    
    results, error_lines = process_turns(lines)
    
    if len(error_lines) != 0:
        for round_ind, errors in error_lines.items():
            print(f"  [{round_ind}] Round errors")
            for err in errors:
                print(f"  * {err}")
        continue 
    
    gid, error = construct_new_game(curr, creds["games"], match_dt, 
                                    league_match, location)

    if error != None:
        print(f"  SQL Error, {error}")
        continue

    error = insert_rosters(curr, creds["rosters"], gid, pids)

    if error != None:
        print(f"  SQL Error, {error}")
        continue
    
    error = insert_turns(curr, creds["turns"], gid, results)

    if error != None:
        print(f"  SQL Error, {error}")
        continue

    # Finally, move this file into the old data file location.
    shutil.move(abs_path, os.path.join(OLD_DATA_PATH, df))

            


                
                






