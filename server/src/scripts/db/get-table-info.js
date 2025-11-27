import pg from "pg";
import dotenv from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "out");

async function getTableInfo(tableName) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let output = "";

  try {
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;

    const columns = await pool.query(columnsQuery, [tableName]);

    const constraintsQuery = `
      SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = $1;
    `;

    const constraints = await pool.query(constraintsQuery, [tableName]);

    const foreignKeysQuery = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1;
    `;

    const foreignKeys = await pool.query(foreignKeysQuery, [tableName]);

    const referencedByQuery = `
      SELECT
        tc.table_name AS referencing_table,
        kcu.column_name AS referencing_column,
        ccu.column_name AS referenced_column,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = $1;
    `;

    const referencedBy = await pool.query(referencedByQuery, [tableName]);

    const uniqueColumnsQuery = `
      SELECT DISTINCT
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = $1
        AND (tc.constraint_type = 'UNIQUE' OR tc.constraint_type = 'PRIMARY KEY');
    `;

    const uniqueColumns = await pool.query(uniqueColumnsQuery, [tableName]);
    const uniqueColumnNames = new Set(
      uniqueColumns.rows.map((row) => row.column_name)
    );

    output += `# Table: ${tableName}\n\n`;
    output += `Generated on: ${new Date().toLocaleString()}\n\n`;

    output += `## Table of Contents\n\n`;
    output += `- [Columns](#columns)\n`;
    output += `- [Constraints](#constraints)\n`;
    if (foreignKeys.rows.length > 0) {
      output += `- [Foreign Keys (References)](#foreign-keys-references)\n`;
    }
    if (referencedBy.rows.length > 0) {
      output += `- [Referenced By](#referenced-by)\n`;
    }
    output += `- [TypeScript Interfaces](#typescript-interfaces)\n`;
    output += `  - [Full Interface](#full-interface)\n`;
    output += `  - [Identifiers Interface](#identifiers-interface)\n`;
    output += `  - [Non-Identifiers Interface](#non-identifiers-interface)\n\n`;

    output += `## Columns\n\n`;
    output += `| Column Name | Data Type | Max Length | Nullable | Default | Unique |\n`;
    output += `|-------------|-----------|------------|----------|---------|--------|\n`;

    for (const col of columns.rows) {
      const isUnique = uniqueColumnNames.has(col.column_name);
      output += `| ${col.column_name} | ${col.data_type} | ${
        col.character_maximum_length || "N/A"
      } | ${col.is_nullable} | ${col.column_default || "None"} | ${
        isUnique ? "✓" : ""
      } |\n`;
    }

    output += `\n`;

    output += `## Constraints\n\n`;
    if (constraints.rows.length > 0) {
      output += `| Constraint Name | Type |\n`;
      output += `|-----------------|------|\n`;
      for (const constraint of constraints.rows) {
        output += `| ${constraint.constraint_name} | ${constraint.constraint_type} |\n`;
      }
    } else {
      output += `No constraints found.\n`;
    }

    output += `\n`;

    if (foreignKeys.rows.length > 0) {
      output += `## Foreign Keys (References)\n\n`;
      output += `This table references the following tables:\n\n`;
      output += `| Column | References Table | References Column | On Delete | On Update |\n`;
      output += `|--------|------------------|-------------------|-----------|----------|\n`;

      for (const fk of foreignKeys.rows) {
        output += `| ${fk.column_name} | **${fk.foreign_table_name}** | ${fk.foreign_column_name} | ${fk.delete_rule} | ${fk.update_rule} |\n`;
      }

      output += `\n`;
    }

    if (referencedBy.rows.length > 0) {
      output += `## Referenced By\n\n`;
      output += `This table is referenced by the following tables:\n\n`;
      output += `| Referencing Table | Referencing Column | Referenced Column | On Delete | On Update |\n`;
      output += `|-------------------|-------------------|-------------------|-----------|----------|\n`;

      for (const ref of referencedBy.rows) {
        output += `| **${ref.referencing_table}** | ${ref.referencing_column} | ${ref.referenced_column} | ${ref.delete_rule} | ${ref.update_rule} |\n`;
      }

      output += `\n`;
    }

    output += `## TypeScript Interfaces\n\n`;

    output += `### Full Interface\n\n`;
    output += "```typescript\n";
    output += generateInterface(
      tableName,
      columns.rows,
      foreignKeys.rows,
      uniqueColumnNames
    );
    output += "```\n\n";

    output += `### Identifiers Interface\n\n`;
    output +=
      "This interface contains only unique/identifier columns (primary keys and unique constraints).\n\n";
    output += "```typescript\n";
    output += generateIdentifiersInterface(
      tableName,
      columns.rows,
      foreignKeys.rows,
      uniqueColumnNames
    );
    output += "```\n\n";

    output += `### Non-Identifiers Interface\n\n`;
    output +=
      "This interface contains only non-unique columns (excluding identifiers).\n\n";
    output += "```typescript\n";
    output += generateNonIdentifiersInterface(
      tableName,
      columns.rows,
      foreignKeys.rows,
      uniqueColumnNames
    );
    output += "```\n";

    console.log("\nTable:", tableName);
    console.log("\nColumns:");
    console.table(columns.rows);

    console.log("\nConstraints:");
    console.table(constraints.rows);

    if (foreignKeys.rows.length > 0) {
      console.log("\nForeign Keys (References):");
      console.table(foreignKeys.rows);
    }

    if (referencedBy.rows.length > 0) {
      console.log("\nReferenced By:");
      console.table(referencedBy.rows);
    }

    console.log("\nUnique Columns (Identifiers):");
    console.log([...uniqueColumnNames]);

    console.log("\nTypeScript Interfaces:");
    console.log("\n--- Full Interface ---");
    console.log(
      generateInterface(
        tableName,
        columns.rows,
        foreignKeys.rows,
        uniqueColumnNames
      )
    );
    console.log("\n--- Identifiers Interface ---");
    console.log(
      generateIdentifiersInterface(
        tableName,
        columns.rows,
        foreignKeys.rows,
        uniqueColumnNames
      )
    );
    console.log("\n--- Non-Identifiers Interface ---");
    console.log(
      generateNonIdentifiersInterface(
        tableName,
        columns.rows,
        foreignKeys.rows,
        uniqueColumnNames
      )
    );

    mkdirSync(outDir, { recursive: true });
    const outputPath = join(outDir, `${tableName}.md`);
    writeFileSync(outputPath, output, "utf-8");

    console.log(`\nOutput saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

function generateInterface(tableName, columns, foreignKeys, uniqueColumnNames) {
  const typeMap = {
    uuid: "string",
    text: "string",
    "character varying": "string",
    integer: "number",
    boolean: "boolean",
    "timestamp without time zone": "Date",
    "timestamp with time zone": "Date",
    date: "Date",
    numeric: "string",
    decimal: "string",
    bigint: "string",
    int8: "string",
    real: "number",
    float4: "number",
    "double precision": "number",
    float8: "number",
    bool: "boolean",
    json: "any",
    jsonb: "any",
    array: "any[]",
    bytea: "Buffer",
  };

  const interfaceName = toPascalCase(tableName);

  let result = `export interface ${interfaceName} {\n`;

  const fkMap = new Map();
  for (const fk of foreignKeys) {
    fkMap.set(fk.column_name, fk.foreign_table_name);
  }

  for (const col of columns) {
    const tsType = typeMap[col.data_type] || "any";

    const hasDefault =
      col.column_default !== null && col.column_default !== undefined;
    const isNullable = col.is_nullable === "YES";

    let typeAnnotation;

    if (hasDefault && !isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    } else if (hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else if (!hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    }

    const comments = [];
    if (fkMap.has(col.column_name)) {
      comments.push(`Foreign key to ${fkMap.get(col.column_name)} table`);
    }
    if (uniqueColumnNames.has(col.column_name)) {
      comments.push("Identifier/Unique");
    }

    if (comments.length > 0) {
      result += `  /** ${comments.join(" | ")} */\n`;
    }

    result += `  ${typeAnnotation}\n`;
  }

  result += "}\n";
  return result;
}

function generateIdentifiersInterface(
  tableName,
  columns,
  foreignKeys,
  uniqueColumnNames
) {
  const typeMap = {
    uuid: "string",
    text: "string",
    "character varying": "string",
    integer: "number",
    boolean: "boolean",
    "timestamp without time zone": "Date",
    "timestamp with time zone": "Date",
    date: "Date",
    numeric: "string",
    decimal: "string",
    bigint: "string",
    int8: "string",
    real: "number",
    float4: "number",
    "double precision": "number",
    float8: "number",
    bool: "boolean",
    json: "any",
    jsonb: "any",
    array: "any[]",
    bytea: "Buffer",
  };

  const interfaceName = toPascalCase(tableName) + "Identifiers";
  const identifierColumns = columns.filter((col) =>
    uniqueColumnNames.has(col.column_name)
  );

  if (identifierColumns.length === 0) {
    return `// No unique/identifier columns found for ${tableName}\n`;
  }

  let result = `export interface ${interfaceName} {\n`;

  const fkMap = new Map();
  for (const fk of foreignKeys) {
    fkMap.set(fk.column_name, fk.foreign_table_name);
  }

  for (const col of identifierColumns) {
    const tsType = typeMap[col.data_type] || "any";

    const hasDefault =
      col.column_default !== null && col.column_default !== undefined;
    const isNullable = col.is_nullable === "YES";

    let typeAnnotation;

    if (hasDefault && !isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    } else if (hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else if (!hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    }

    if (fkMap.has(col.column_name)) {
      result += `  /** Foreign key to ${fkMap.get(col.column_name)} table */\n`;
    }

    result += `  ${typeAnnotation}\n`;
  }

  result += "}\n";
  return result;
}

function generateNonIdentifiersInterface(
  tableName,
  columns,
  foreignKeys,
  uniqueColumnNames
) {
  const typeMap = {
    uuid: "string",
    text: "string",
    "character varying": "string",
    integer: "number",
    boolean: "boolean",
    "timestamp without time zone": "Date",
    "timestamp with time zone": "Date",
    date: "Date",
    numeric: "string",
    decimal: "string",
    bigint: "string",
    int8: "string",
    real: "number",
    float4: "number",
    "double precision": "number",
    float8: "number",
    bool: "boolean",
    json: "any",
    jsonb: "any",
    array: "any[]",
    bytea: "Buffer",
  };

  const interfaceName = toPascalCase(tableName) + "NonIdentifiers";
  const nonIdentifierColumns = columns.filter(
    (col) => !uniqueColumnNames.has(col.column_name)
  );

  if (nonIdentifierColumns.length === 0) {
    return `// No non-identifier columns found for ${tableName}\n`;
  }

  let result = `export interface ${interfaceName} {\n`;

  const fkMap = new Map();
  for (const fk of foreignKeys) {
    fkMap.set(fk.column_name, fk.foreign_table_name);
  }

  for (const col of nonIdentifierColumns) {
    const tsType = typeMap[col.data_type] || "any";

    const hasDefault =
      col.column_default !== null && col.column_default !== undefined;
    const isNullable = col.is_nullable === "YES";

    let typeAnnotation;

    if (hasDefault && !isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    } else if (hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else if (!hasDefault && isNullable) {
      typeAnnotation = `${col.column_name}: ${tsType} | null;`;
    } else {
      typeAnnotation = `${col.column_name}: ${tsType};`;
    }

    if (fkMap.has(col.column_name)) {
      result += `  /** Foreign key to ${fkMap.get(col.column_name)} table */\n`;
    }

    result += `  ${typeAnnotation}\n`;
  }

  result += "}\n";
  return result;
}

function toPascalCase(str) {
  return (
    str.charAt(0).toUpperCase() +
    str.slice(1).replace(/_([a-z])/g, (_, l) => l.toUpperCase())
  );
}

const tableName = process.argv[2];

if (!tableName) {
  console.log("Usage: node get-table-info.js <table_name>");
  process.exit(1);
}

getTableInfo(tableName);
