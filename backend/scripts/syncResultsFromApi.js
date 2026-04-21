require('dotenv').config();
const axios = require('axios');

const LOCAL_API = 'http://localhost:3001/api';
const ADMIN_TOKEN = process.env.ADMIN_SYNC_TOKEN || '';

(async () => {
  if (!ADMIN_TOKEN) {
    throw new Error('ADMIN_SYNC_TOKEN ausente no .env');
  }

  const res = await axios.post(
    `${LOCAL_API}/admin/sync-results`,
    {},
    {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      timeout: 60000,
    }
  );

  console.log(JSON.stringify(res.data, null, 2));
})().catch((err) => {
  console.error(err?.response?.data || err.message);
  process.exit(1);
});
