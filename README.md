# Database MCP Server

MCP server for SQL Server database access, providing query execution, schema exploration, and data management capabilities.

## Features

- **Execute Queries**: Run SELECT, INSERT, UPDATE, DELETE statements
- **Schema Exploration**: List tables, describe table structures, view relationships
- **Stored Procedures**: List, view definitions, and execute stored procedures
- **Data Search**: Search for data across table columns
- **Table Relationships**: View foreign key relationships

## Prerequisites

- Node.js 18.0.0 or higher
- SQL Server (local or Azure SQL)
- Database access credentials (Windows Auth or SQL Auth)

## Setup

1. **Install dependencies**:
   ```powershell
   cd <project-directory>
   npm install
   ```

2. **Create `.env` file** from the example:
   ```powershell
   cp .env.example .env
   ```

3. **Configure your database connection** in `.env`:

   **For Windows Authentication (recommended for local development)**:
   ```env
   DB_SERVER=localhost
   DB_DATABASE=DbName
   DB_PORT=1433
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

   **For SQL Server Authentication**:
   ```env
   DB_SERVER=localhost
   DB_DATABASE=DbName
   DB_USER=sa
   DB_PASSWORD=YourPassword
   DB_PORT=1433
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

   **For Azure SQL Database**:
   ```env
   DB_SERVER=yourserver.database.windows.net
   DB_DATABASE=DbName
   DB_USER=yourusername
   DB_PASSWORD=YourPassword
   DB_PORT=1433
   DB_ENCRYPT=true
   DB_TRUST_SERVER_CERTIFICATE=false
   ```

## Available Tools

### 1. execute_query
Execute SQL queries and get results.

**Parameters**:
- `query` (required): SQL query to execute
- `maxRows` (optional): Maximum rows to return (default: 100)

**Example**:
```json
{
  "query": "SELECT TOP 10 * FROM Orders WHERE OrderDate >= '2025-01-01'",
  "maxRows": 10
}
```

### 2. list_tables
List all tables in the database with row counts and space usage.

**Parameters**:
- `schema` (optional): Filter by schema name

**Example**:
```json
{
  "schema": "dbo"
}
```

### 3. describe_table
Get detailed information about a table including columns, data types, constraints, and indexes.

**Parameters**:
- `tableName` (required): Name of the table (can include schema)

**Example**:
```json
{
  "tableName": "dbo.Orders"
}
```

### 4. list_stored_procedures
List all stored procedures in the database.

**Parameters**:
- `schema` (optional): Filter by schema name

### 5. get_stored_procedure_definition
Get the source code of a stored procedure.

**Parameters**:
- `procedureName` (required): Name of the stored procedure

**Example**:
```json
{
  "procedureName": "dbo.GetOrdersByCustomer"
}
```

### 6. execute_stored_procedure
Execute a stored procedure with parameters.

**Parameters**:
- `procedureName` (required): Name of the stored procedure
- `parameters` (optional): Parameters as key-value pairs

**Example**:
```json
{
  "procedureName": "dbo.GetOrdersByCustomer",
  "parameters": {
    "@CustomerId": 123,
    "@StartDate": "2025-01-01"
  }
}
```

### 7. search_data
Search for data across table columns.

**Parameters**:
- `tableName` (required): Name of the table
- `searchTerm` (required): Term to search for
- `columns` (optional): Specific columns to search (searches all text columns if not specified)
- `maxRows` (optional): Maximum rows to return (default: 50)

**Example**:
```json
{
  "tableName": "dbo.Products",
  "searchTerm": "keyboard",
  "columns": ["ProductName", "Description"],
  "maxRows": 20
}
```

### 8. get_table_relationships
Get foreign key relationships for a table.

**Parameters**:
- `tableName` (required): Name of the table

**Example**:
```json
{
  "tableName": "dbo.Orders"
}
```

## Usage Examples

### Query Orders
```
You: "Show me the last 10 orders from the database"
Copilot: [Uses execute_query with appropriate SQL]
```

### Explore Schema
```
You: "What tables are in the database?"
Copilot: [Uses list_tables to show all tables]

You: "Describe the Orders table"
Copilot: [Uses describe_table to show columns, types, indexes]
```

### Search Data
```
You: "Find all products containing 'laptop' in the database"
Copilot: [Uses search_data on Products table]
```

### Execute Stored Procedures
```
You: "Run the GetOrdersByCustomer procedure for customer ID 123"
Copilot: [Uses execute_stored_procedure with parameters]
```

## Security Notes

- ⚠️ **Never commit `.env` file** - it contains database credentials!
- ⚠️ Use **read-only database user** for safety in production
- ⚠️ The server has **full database access** - use with caution
- 🔐 Prefer **Windows Authentication** for local development
- 🔒 Use **least privilege** principle - only grant necessary permissions

## Connection String Examples

### Local SQL Server Express (Windows Auth)
```env
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=DbName
# Leave DB_USER and DB_PASSWORD empty for Windows Auth
```

### Named Instance
```env
DB_SERVER=SERVERNAME\INSTANCENAME
DB_DATABASE=DbName
```

### IP Address
```env
DB_SERVER=192.168.1.100
DB_DATABASE=DbName
DB_PORT=1433
```

## Troubleshooting

**Connection failed**:
- Verify SQL Server is running
- Check firewall allows port 1433
- Ensure TCP/IP protocol is enabled in SQL Server Configuration Manager
- Verify credentials are correct

**Windows Authentication not working**:
- Ensure you're running as the correct Windows user
- Check SQL Server allows Windows Authentication
- Verify the user has access to the database

**Azure SQL issues**:
- Set `DB_ENCRYPT=true`
- Set `DB_TRUST_SERVER_CERTIFICATE=false`
- Verify firewall rules allow your IP address
- Use fully qualified username: `username@servername`

**Query timeout**:
- Large queries may timeout
- Use `maxRows` parameter to limit results
- Consider adding WHERE clauses to filter data

## Testing the Connection

Run this command to test:
```powershell
cd <project-directory>
node -e "require('dotenv').config(); const sql = require('mssql'); const config = { server: process.env.DB_SERVER, database: process.env.DB_DATABASE, options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' } }; if (process.env.DB_USER) { config.user = process.env.DB_USER; config.password = process.env.DB_PASSWORD; } else { config.authentication = { type: 'ntlm' }; } sql.connect(config).then(() => { console.log('Connected!'); process.exit(0); }).catch(err => { console.error('Connection failed:', err.message); process.exit(1); });"
```

## License

MIT
