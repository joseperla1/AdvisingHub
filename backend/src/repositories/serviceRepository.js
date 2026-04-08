const { getPool, sql } = require('../config/db');
const { serviceCode } = require('../utils/codeGenerator');

class ServiceRepository {
  async findAll() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        service_code AS id,
        service_name AS name,
        description,
        expected_duration_min AS expectedDurationMin,
        priority_level AS priority,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM services
      WHERE is_active = 1
      ORDER BY service_name ASC
    `);
    return result.recordset;
  }

  async findById(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('service_code', sql.VarChar(20), String(id))
      .query(`
        SELECT TOP 1
          service_code AS id,
          service_name AS name,
          description,
          expected_duration_min AS expectedDurationMin,
          priority_level AS priority,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM services
        WHERE service_code = @service_code
      `);
    return result.recordset[0] || null;
  }

  async create(service) {
    const pool = await getPool();
    const code = service.id || service.serviceCode || serviceCode();

    await pool
      .request()
      .input('service_code', sql.VarChar(20), code)
      .input('service_name', sql.VarChar(100), service.name)
      .input('description', sql.VarChar(sql.MAX), service.description || '')
      .input('expected_duration_min', sql.Int, service.expectedDurationMin ?? 15)
      .input('priority_level', sql.VarChar(10), service.priority || 'normal')
      .input('is_active', sql.Bit, service.isActive == null ? 1 : service.isActive ? 1 : 0)
      .query(`
        INSERT INTO services (
          service_code,
          service_name,
          description,
          expected_duration_min,
          priority_level,
          is_active
        )
        VALUES (
          @service_code,
          @service_name,
          @description,
          @expected_duration_min,
          @priority_level,
          @is_active
        )
      `);

    return this.findById(code);
  }

  async update(id, updatedService) {
    const pool = await getPool();

    const existing = await this.findById(id);
    if (!existing) return null;

    const nextName = updatedService.name ?? existing.name;
    const nextDesc = updatedService.description ?? existing.description;
    const nextDuration = updatedService.expectedDurationMin ?? updatedService.expectedDuration ?? existing.expectedDurationMin;
    const nextPriority = updatedService.priority ?? existing.priority;
    const nextIsActive = updatedService.isActive ?? existing.isActive;

    await pool
      .request()
      .input('service_code', sql.VarChar(20), String(id))
      .input('service_name', sql.VarChar(100), nextName)
      .input('description', sql.VarChar(sql.MAX), nextDesc || '')
      .input('expected_duration_min', sql.Int, nextDuration)
      .input('priority_level', sql.VarChar(10), nextPriority)
      .input('is_active', sql.Bit, nextIsActive ? 1 : 0)
      .query(`
        UPDATE services
        SET
          service_name = @service_name,
          description = @description,
          expected_duration_min = @expected_duration_min,
          priority_level = @priority_level,
          is_active = @is_active,
          updated_at = GETDATE()
        WHERE service_code = @service_code
      `);

    return this.findById(id);
  }

  async removeById(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('service_code', sql.VarChar(20), String(id))
      .query(`
        UPDATE services
        SET is_active = 0, updated_at = GETDATE()
        WHERE service_code = @service_code
      `);
    return result.rowsAffected?.[0] > 0;
  }
}

module.exports = new ServiceRepository();