const { getPool, sql } = require('../config/db');
const { userCode } = require('../utils/codeGenerator');

class UserRepository {
  async findCredentialByEmail(email) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('email', sql.VarChar(255), String(email).toLowerCase())
      .query(`
        SELECT TOP 1
          uc.id AS userId,
          uc.user_code AS userCode,
          uc.email,
          uc.password_hash AS passwordHash,
          uc.role
        FROM user_credentials uc
        WHERE uc.email = @email
      `);
    return result.recordset[0] || null;
  }

  async findByUserCode(userCodeValue) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('user_code', sql.VarChar(20), String(userCodeValue))
      .query(`
        SELECT TOP 1
          uc.user_code AS id,
          uc.email,
          uc.role,
          up.full_name AS name,
          up.student_id AS studentId
        FROM user_credentials uc
        LEFT JOIN user_profile up ON up.user_id = uc.id
        WHERE uc.user_code = @user_code
      `);
    return result.recordset[0] || null;
  }

  async findDefaultAdvisor() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1
        uc.user_code AS id,
        uc.email,
        uc.role,
        up.full_name AS name
      FROM user_credentials uc
      LEFT JOIN user_profile up ON up.user_id = uc.id
      WHERE uc.role = 'admin'
      ORDER BY uc.created_at ASC
    `);
    return result.recordset[0] || null;
  }

  async createUserWithProfile({ email, passwordHash, fullName, role }) {
    const pool = await getPool();
    const code = userCode();

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const req1 = new sql.Request(tx);
      const insertCred = await req1
        .input('user_code', sql.VarChar(20), code)
        .input('email', sql.VarChar(255), String(email).toLowerCase())
        .input('password_hash', sql.VarChar(255), passwordHash)
        .input('role', sql.VarChar(10), role === 'admin' ? 'admin' : 'user')
        .query(`
          INSERT INTO user_credentials (user_code, email, password_hash, role)
          OUTPUT INSERTED.id AS id
          VALUES (@user_code, @email, @password_hash, @role)
        `);

      const newUserId = insertCred.recordset[0].id;

      const req2 = new sql.Request(tx);
      await req2
        .input('user_id', sql.BigInt, newUserId)
        .input('full_name', sql.VarChar(100), fullName || String(email))
        .query(`
          INSERT INTO user_profile (user_id, full_name)
          VALUES (@user_id, @full_name)
        `);

      await tx.commit();
      return this.findByUserCode(code);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}

module.exports = new UserRepository();
