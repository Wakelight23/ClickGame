/**
 * 스키마 기반 검증 함수
 * @param {Object} schema - { fieldName: { type: 'string'|'number'|'boolean', required: boolean } }
 * @param {Object} obj - 검증할 객체 (예: request body)
 * @throws {Error} 검증 실패 시 에러를 던집니다.
 */
export function validateSchema(schema, obj) {
  for (const [key, rule] of Object.entries(schema)) {
    const value = obj[key];

    if (rule.required && (value === undefined || value === null)) {
      throw new Error(`Validation failed: '${key}' is required`);
    }
    if (value != null) {
      const actualType = typeof value;
      if (actualType !== rule.type) {
        throw new Error(
          `Validation failed: '${key}' should be ${rule.type}, got ${actualType}`
        );
      }
    }
  }
}
