const axios = require('axios');

const API = 'http://localhost:3001/api';

const updates = [
  {
    matchId: '7d20724c-7baa-4692-b209-059694c52f71',
    homeScore: 5,
    awayScore: 0,
  },
];

async function run() {
  for (const u of updates) {
    try {
      const res = await axios.patch(`${API}/matches/${u.matchId}/result`, {
        homeScore: u.homeScore,
        awayScore: u.awayScore,
        status: 'FINISHED',
      }, {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4YTM2ZGNjZS0wNzVmLTQ4MzUtYjNjNC1iYmY1NmI4MzhhNmUiLCJlbWFpbCI6ImFkbWluQG5hZ2F2ZXRhLmNvbSIsImlhdCI6MTc3NjYzNTkyNCwiZXhwIjoxNzc3MjQwNzI0fQ.6OL46u0M1Xvq79vjZlp5p96GzsnCr1vK1WBXmbfItD0'
        }
      });

      console.log('OK:', res.data.message);
    } catch (err) {
      console.error('ERRO:', err.response?.data || err.message);
    }
  }
}

run();
