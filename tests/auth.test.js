const request = require('supertest');
const app = require('../server');
const { connectDB, pool } = require('../config/database');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  if (pool) {
    await pool.query("DELETE FROM users WHERE email LIKE 'test_%@naus.com'");
    await pool.end();
  }
});

describe('Dashboard Integration Tests', () => {
  
  it('should return 200 for the health check', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
  });

  it('should create and then retrieve a member', async () => {
    const uniqueEmail = `test_${Date.now()}@naus.com`;
    
    // 1. Create the member
    await request(app)
      .post('/api/auth/register')
      .send({
        name: "Dashboard Test",
        email: uniqueEmail,
        password: "password123",
        role: "member"
      });

    // 2. Retrieve the member list
    const res = await request(app).get('/api/members');

    // 3. Assertions
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some(user => user.email === uniqueEmail)).toBe(true);
  });
});