from cmath import e
from distutils.log import error
import os
import json
import datetime as dt

# This script will parse game csv files in the form :
# MM.DD.YY.HH:MM(AM|PM).csv
#
# Each file of this form found in the "new_data" directory 
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

# Given a csv from the senior league sheet...
# Add three header lines. The first line must specify the datetime
# in the following format...
DATE_PATTERN = "%m/%d/%Y %I:%M %p"

def ind_to_cards(ind):
    return ind if ind <= 13 else 26 - ind

# The second line must be in the form
# (true|false)
# The true or false value specifies whether the match is a league match
# or not... 
# The third line specifies the location.

creds = None

# First attempt to load credentials...
try:
    creds_f = open(CREDS_PATH, "r")
    creds = json.load(creds_f)
    creds_f.close()
except e:
    print("Cannot located creds.json")
    exit(1)

# All new_data files to check.
new_data_files = os.listdir(NEW_DATA_PATH)

for df in new_data_files:
    print(f"> {df}")

    match_dt = None
    league_match = False
    location = ""
    results = [[{"bet": -1, "earned": -1} for _ in range(4)] 
                for _ in range(1, 26)]
    pids = [-1, -1, -1, -1]

    # First attempt to extract necessary information from 
    # the file.
    with open(os.path.join(NEW_DATA_PATH, df), "r") as f:
        lines = [line[:-1] for line in f.readlines()]

        # The file should have no less than 30 lines.
        if len(lines) < 30:
            print(f"  Too few lines in file ({len(lines)})")
            continue

        try:
            match_dt = dt.datetime.strptime(lines[0], DATE_PATTERN)
        except:
            print(f"  Bad date header ({lines[0]})")
            continue

        league_match = lines[1].startswith("true")
        location = lines[2]

        try:
            names = lines[4].split(",")
            for i in range(4):
                name = names[i*3 + 3]
                pids[i] = PLAYER_IDS[name]
        except:
            print("Error parsing player names header")
            continue

        # Toss first five lines now that header has been processed.
        lines = lines[5:]
        error_lines = {}

        # The next 25 will be read as turn lines.
        for round_ind in range(1, 26):
            line = lines[round_ind - 1]
            args = line.split(",")
            # First get the results... then get the
            try:
                card_amount = args[0]

                # Confirm card amount is correct for given round.
                if int(card_amount) != ind_to_cards(round_ind):
                    error_lines[round_ind] = f"Invalid card amount ({card_amount})"
                    continue

                for i in range(4):
                    results[round_ind - 1][i]["bet"] = int(args[4 + i*3])
                    results[round_ind - 1][i]["earned"] = int(args[5 + i*3])
            except:
                error_lines[round_ind] = f"Error while parsing line"
        
        if len(error_lines) != 0:
            for round_ind, error_str in error_lines.items():
                print(f"  [{round_ind}] {error_str}")
            continue 

    # Done with the file itself.
    # Time to run SQL.
    # First, create the game, then the roster, then the
    for r in range(1, 26):
        print(f"Round {r}")
        for i in range(4):
            print(f"Player {pids[i]} : {results[r - 1][i]}")
            


                
                






