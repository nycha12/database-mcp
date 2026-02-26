#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// SQL Server configuration from environment variables
const DB_SERVER = process.env.DB_SERVER;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = process.env.DB_PORT || 1433;
const DB_ENCRYPT = process.env.DB_ENCRYPT === 'true';
const DB_TRUST_SERVER_CERTIFICATE = process.env.DB_TRUST_SERVER_CERTIFICATE === 'true';

if (!DB_SERVER || !DB_DATABASE) {
  console.error('Error: Missing required environment variables:');
  console.error('- DB_SERVER (e.g., localhost or server.database.windows.net)');
  console.error('- DB_DATABASE (database name)');
  console.error('Optional: DB_USER, DB_PASSWORD (use Windows auth if not provided)');
  process.exit(1);
}

// SQL Server connection pool
let pool;

async function initializeDatabase() {
  const config = {
    server: DB_SERVER,
    database: DB_DATABASE,
    port: parseInt(DB_PORT),
    options: {
      encrypt: DB_ENCRYPT,
      trustServerCertificate: DB_TRUST_SERVER_CERTIFICATE,
      enableArithAbort: true,
    },
  };

  // Use Windows Authentication or SQL Server Authentication
  if (DB_USER && process.env.DB_AUTHENTICATION === 'azure-active-directory-default') {
    config.authentication = {
      type: 'azure-active-directory-default',
      options: {
        userName: DB_USER,
        password: '', // Leave empty for interactive
      }
    };
  } else if (DB_USER && DB_PASSWORD) {
    config.user = DB_USER;
    config.password = DB_PASSWORD;
    config.authentication = {
      type: 'default'
    };
  } else {
    config.authentication = {
      type: 'ntlm',
      options: {
        domain: process.env.DB_DOMAIN || ''
      }
    };
  }

  pool = await sql.connect(config);
  console.log('Database connection established');
}

// MCP Server setup
const server = new Server(
  {
    name: 'database-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'execute_query',
        description: 'Execute a SQL query and return results. Supports SELECT, ',
            // 'INSERT, UPDATE, DELETE statements.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute',
            },
            maxRows: {
              type: 'number',
              description: 'Maximum number of rows to return (default: 100)',
              default: 100,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the database with row counts',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Filter by schema name (optional)',
            },
          },
        },
      },
      {
        name: 'describe_table',
        description: 'Get detailed information about a table including columns, data types, constraints, and indexes',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'Name of the table (can include schema, e.g., dbo.Orders)',
            },
          },
          required: ['tableName'],
        },
      },
      {
        name: 'list_stored_procedures',
        description: 'List all stored procedures in the database',
        inputSchema: {
          type: 'object',
          properties: {
            schema: {
              type: 'string',
              description: 'Filter by schema name (optional)',
            },
          },
        },
      },
      {
        name: 'get_stored_procedure_definition',
        description: 'Get the definition/source code of a stored procedure',
        inputSchema: {
          type: 'object',
          properties: {
            procedureName: {
              type: 'string',
              description: 'Name of the stored procedure (can include schema)',
            },
          },
          required: ['procedureName'],
        },
      },
      {
        name: 'execute_stored_procedure',
        description: 'Execute a stored procedure with parameters',
        inputSchema: {
          type: 'object',
          properties: {
            procedureName: {
              type: 'string',
              description: 'Name of the stored procedure',
            },
            parameters: {
              type: 'object',
              description: 'Parameters as key-value pairs (e.g., {"@param1": "value1", "@param2": 123})',
            },
          },
          required: ['procedureName'],
        },
      },
      {
        name: 'search_data',
        description: 'Search for data across specified table columns',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'Name of the table to search in',
            },
            searchTerm: {
              type: 'string',
              description: 'Term to search for',
            },
            columns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Columns to search in (optional, searches all text columns if not specified)',
            },
            maxRows: {
              type: 'number',
              description: 'Maximum rows to return (default: 50)',
              default: 50,
            },
          },
          required: ['tableName', 'searchTerm'],
        },
      },
      {
        name: 'get_table_relationships',
        description: 'Get foreign key relationships for a table',
        inputSchema: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'Name of the table',
            },
          },
          required: ['tableName'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'execute_query': {
        if (args.toLowerCase().includes('update') || args.includes('delete') || args.includes('insert')) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Update, delete, and insert statements are not allowed in this tool',
              },
            ],
          }
        }
        const { query, maxRows = 100 } = args;
        
        const result = await pool.request().query(query);
        
        let response = {
          rowsAffected: result.rowsAffected[0],
          recordset: result.recordset ? result.recordset.slice(0, maxRows) : [],
          recordsetCount: result.recordset ? result.recordset.length : 0,
        };

        if (result.recordset && result.recordset.length > maxRows) {
          response.note = `Only showing first ${maxRows} rows out of ${result.recordset.length} total rows`;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case 'list_tables': {
        const { schema } = args;
        
        let query = `
          SELECT 
            s.name AS SchemaName,
            t.name AS TableName,
            p.rows AS RowCount,
            SUM(a.total_pages) * 8 AS TotalSpaceKB,
            SUM(a.used_pages) * 8 AS UsedSpaceKB
          FROM sys.tables t
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          INNER JOIN sys.indexes i ON t.object_id = i.object_id
          INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
          INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
          ${schema ? `WHERE s.name = @schema` : ''}
          GROUP BY s.name, t.name, p.rows
          ORDER BY s.name, t.name
        `;

        const sqlRequest = pool.request();
        if (schema) {
          sqlRequest.input('schema', sql.NVarChar, schema);
        }

        const result = await sqlRequest.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.recordset, null, 2),
            },
          ],
        };
      }

      case 'describe_table': {
        const { tableName } = args;
        
        const [schema, table] = tableName.includes('.') 
          ? tableName.split('.') 
          : ['dbo', tableName];

        // Get columns
        const columnsQuery = `
          SELECT 
            c.name AS ColumnName,
            t.name AS DataType,
            c.max_length AS MaxLength,
            c.precision AS Precision,
            c.scale AS Scale,
            c.is_nullable AS IsNullable,
            c.is_identity AS IsIdentity,
            ISNULL(dc.definition, '') AS DefaultValue,
            ISNULL(ep.value, '') AS Description
          FROM sys.columns c
          INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
          LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
          LEFT JOIN sys.extended_properties ep ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
          WHERE c.object_id = OBJECT_ID(@tableName)
          ORDER BY c.column_id
        `;

        // Get primary keys
        const primaryKeysQuery = `
          SELECT c.name AS ColumnName
          FROM sys.indexes i
          INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE i.object_id = OBJECT_ID(@tableName) AND i.is_primary_key = 1
          ORDER BY ic.key_ordinal
        `;

        // Get indexes
        const indexesQuery = `
          SELECT 
            i.name AS IndexName,
            i.type_desc AS IndexType,
            i.is_unique AS IsUnique,
            STRING_AGG(c.name, ', ') AS Columns
          FROM sys.indexes i
          INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE i.object_id = OBJECT_ID(@tableName) AND i.type > 0
          GROUP BY i.name, i.type_desc, i.is_unique
          ORDER BY i.name
        `;

        const fullTableName = `${schema}.${table}`;
        
        const [columns, primaryKeys, indexes] = await Promise.all([
          pool.request().input('tableName', sql.NVarChar, fullTableName).query(columnsQuery),
          pool.request().input('tableName', sql.NVarChar, fullTableName).query(primaryKeysQuery),
          pool.request().input('tableName', sql.NVarChar, fullTableName).query(indexesQuery),
        ]);

        const tableInfo = {
          schema,
          tableName: table,
          columns: columns.recordset,
          primaryKeys: primaryKeys.recordset.map(pk => pk.ColumnName),
          indexes: indexes.recordset,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tableInfo, null, 2),
            },
          ],
        };
      }

      case 'list_stored_procedures': {
        const { schema } = args;
        
        let query = `
          SELECT 
            s.name AS SchemaName,
            p.name AS ProcedureName,
            p.create_date AS CreatedDate,
            p.modify_date AS ModifiedDate
          FROM sys.procedures p
          INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
          ${schema ? `WHERE s.name = @schema` : ''}
          ORDER BY s.name, p.name
        `;

        const sqlRequest = pool.request();
        if (schema) {
          sqlRequest.input('schema', sql.NVarChar, schema);
        }

        const result = await sqlRequest.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.recordset, null, 2),
            },
          ],
        };
      }

      case 'get_stored_procedure_definition': {
        const { procedureName } = args;
        
        const query = `
          SELECT OBJECT_DEFINITION(OBJECT_ID(@procedureName)) AS Definition
        `;

        const result = await pool.request()
          .input('procedureName', sql.NVarChar, procedureName)
          .query(query);

        return {
          content: [
            {
              type: 'text',
              text: result.recordset[0]?.Definition || 'Stored procedure not found',
            },
          ],
        };
      }

      case 'execute_stored_procedure': {
        const { procedureName, parameters = {} } = args;
        
        const sqlRequest = pool.request();
        
        // Add parameters
        for (const [key, value] of Object.entries(parameters)) {
          const paramName = key.startsWith('@') ? key : `@${key}`;
          sqlRequest.input(paramName.substring(1), value);
        }

        const result = await sqlRequest.execute(procedureName);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                rowsAffected: result.rowsAffected,
                recordsets: result.recordsets,
                output: result.output,
                returnValue: result.returnValue,
              }, null, 2),
            },
          ],
        };
      }

      case 'search_data': {
        const { tableName, searchTerm, columns, maxRows = 50 } = args;
        
        const [schema, table] = tableName.includes('.') 
          ? tableName.split('.') 
          : ['dbo', tableName];

        let searchColumns = columns;
        
        // If no columns specified, get all text columns
        if (!searchColumns || searchColumns.length === 0) {
          const columnsQuery = `
            SELECT c.name
            FROM sys.columns c
            INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
            WHERE c.object_id = OBJECT_ID(@tableName)
              AND t.name IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
          `;
          
          const columnsResult = await pool.request()
            .input('tableName', sql.NVarChar, `${schema}.${table}`)
            .query(columnsQuery);
          
          searchColumns = columnsResult.recordset.map(c => c.name);
        }

        if (searchColumns.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, 'No searchable columns found in table');
        }

        // Build WHERE clause
        const whereConditions = searchColumns.map(col => `[${col}] LIKE @searchTerm`).join(' OR ');
        
        const searchQuery = `
          SELECT TOP ${maxRows} *
          FROM [${schema}].[${table}]
          WHERE ${whereConditions}
        `;

        const result = await pool.request()
          .input('searchTerm', sql.NVarChar, `%${searchTerm}%`)
          .query(searchQuery);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                searchedColumns: searchColumns,
                rowsFound: result.recordset.length,
                results: result.recordset,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_table_relationships': {
        const { tableName } = args;
        
        const [schema, table] = tableName.includes('.') 
          ? tableName.split('.') 
          : ['dbo', tableName];

        const query = `
          SELECT 
            fk.name AS ForeignKeyName,
            OBJECT_SCHEMA_NAME(fk.parent_object_id) AS SchemaName,
            OBJECT_NAME(fk.parent_object_id) AS TableName,
            COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
            OBJECT_SCHEMA_NAME(fk.referenced_object_id) AS ReferencedSchema,
            OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
            COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
          FROM sys.foreign_keys fk
          INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
          WHERE OBJECT_NAME(fk.parent_object_id) = @table
            AND OBJECT_SCHEMA_NAME(fk.parent_object_id) = @schema
             OR (OBJECT_NAME(fk.referenced_object_id) = @table
            AND OBJECT_SCHEMA_NAME(fk.referenced_object_id) = @schema)
          ORDER BY fk.name
        `;

        const result = await pool.request()
          .input('schema', sql.NVarChar, schema)
          .input('table', sql.NVarChar, table)
          .query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.recordset, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error('Error executing tool:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing ${name}: ${error.message}`
    );
  }
});

// Start the server
async function main() {
  await initializeDatabase();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Database MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

