function typeMatches(expectedType, value) {
  if (expectedType === "null") return value === null;
  if (expectedType === "array") return Array.isArray(value);
  if (expectedType === "number") return typeof value === "number" && Number.isFinite(value);
  if (expectedType === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === expectedType;
}

function validateNode(schema, value, path, errors) {
  if (!schema || typeof schema !== "object") return;

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.join(", ")}`);
  }

  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((type) => typeMatches(type, value))) {
      errors.push(`${path} must be ${allowed.join(" or ")}`);
      return;
    }
  }

  if (schema.type === "object" || schema.properties || schema.required) {
    for (const key of schema.required || []) {
      if (value?.[key] === undefined) errors.push(`${path}.${key} is required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (value?.[key] !== undefined) validateNode(childSchema, value[key], `${path}.${key}`, errors);
    }
  }

  if ((schema.type === "array" || schema.items) && Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(schema.items, item, `${path}[${index}]`, errors));
    }
  }
}

export function validateSchema(schema, value) {
  const errors = [];
  validateNode(schema, value, "$", errors);
  return errors;
}
