import './App.css';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const data = [
    {
      name: 0,
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
        name: .5,
        // uv: 4000,
        pv: 2000,
        amt: 2400,
    },
    {
        name: 2,
        uv: 4000,
        // pv: 2400,
        amt: 2400,
    }
  ];

function App() {
    return (
        // <div id="main-pane">
        //     <div id="header" class="lighter">
        //         MJL
        //     </div>
        // </div>

        // <div id="main-pane">
        //     Hello
        // </div>
        <ResponsiveContainer width="100%" height={600}>
            <LineChart
                data={data}
                margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
                {/* <Line type="monotone" dataKey="uv" stroke="#82ca9d" /> */}
                <Line type="monotone" dataKey="amt" stroke="#FF0000" />
            </LineChart>
        </ResponsiveContainer>
    );
}

export default App;
