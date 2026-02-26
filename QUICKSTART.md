# 🚀 Quick Start - Database MCP Server

## What You Have

A complete MCP server that provides SQL Server database access through Copilot with 8 powerful tools for querying, schema exploration, and data management.

## 📦 Installation

Run the setup script:

```powershell
cd <project-directory>
.\setup.ps1
```

The setup wizard will:
1. Install npm dependencies
2. Configure database connection
3. Test the connection
4. Update mcp.json
5. Done! ✨

## 🔧 Manual Setup (Alternative)

If the setup script doesn't work:

1. **Install dependencies**:
   ```powershell
   cd <project-directory>
   npm install
   ```

2. **Create `.env` file**:
   ```powershell
   cp .env.example .env
   ```

3. **Edit `.env`** with your database credentials:
   ```env
   DB_SERVER=localhost
   DB_DATABASE=StoreFeeder
   # Leave empty for Windows Authentication
   DB_USER=
   DB_PASSWORD=
   ```

4. **Test connection**:
   ```powershell
   node -e "require('dotenv').config(); const sql = require('mssql'); sql.connect({ server: process.env.DB_SERVER, database: process.env.DB_DATABASE, authentication: { type: 'ntlm' }, options: { encrypt: false, trustServerCertificate: true } }).then(() => console.log('Connected!')).catch(e => console.error(e.message));"
   ```

## 🎯 Available Tools

1. **execute_query** - Run SQL queries (SELECT, INSERT, UPDATE, DELETE)
2. **list_tables** - Show all tables with row counts
3. **describe_table** - Get table structure (columns, types, indexes)
4. **list_stored_procedures** - List all stored procedures
5. **get_stored_procedure_definition** - View stored procedure code
6. **execute_stored_procedure** - Run stored procedures with parameters
7. **search_data** - Search for data in tables
8. **get_table_relationships** - View foreign key relationships

## 💡 Usage Examples

Once configured, you can ask Copilot:

### Query Data
```
"Show me the last 10 orders from the database"
"Find all customers with email containing 'gmail'"
"Get order details for order ID 12345"
```

### Explore Schema
```
"What tables are in the database?"
"Describe the Orders table structure"
"Show me all relationships for the Products table"
```

### Search
```
"Search for products containing 'keyboard'"
"Find all orders for customer 'John Smith'"
```

### Stored Procedures
```
"List all stored procedures"
"Show me the code for GetOrdersByDate procedure"
"Execute GetCustomerOrders with customer ID 123"
```

## 🔒 Security & Best Practices

### For Local Development
- ✅ **Use Windows Authentication** (leave DB_USER and DB_PASSWORD empty)
- ✅ Set `DB_TRUST_SERVER_CERTIFICATE=true`
- ✅ Set `DB_ENCRYPT=false`

### For Production/Azure SQL
- ✅ **Use SQL Authentication** with strong password
- ✅ Set `DB_ENCRYPT=true`
- ✅ Set `DB_TRUST_SERVER_CERTIFICATE=false`
- ⚠️ **Never commit `.env` file** with credentials
- ⚠️ Use **read-only user** if possible

## 🔍 Connection Troubleshooting

### Windows Authentication Not Working
1. Ensure SQL Server allows Windows Auth
2. Check you're running as correct Windows user
3. Verify SQL Server Browser service is running
4. Enable TCP/IP protocol in SQL Server Configuration Manager

### Cannot Connect to localhost
1. Check SQL Server is running
2. Verify instance name (e.g., `localhost\SQLEXPRESS`)
3. Enable TCP/IP in SQL Server Configuration Manager
4. Restart SQL Server service
5. Check firewall allows port 1433

### Azure SQL Issues
1. Add your IP to firewall rules
2. Use fully qualified server name: `yourserver.database.windows.net`
3. Set `DB_ENCRYPT=true`
4. Username format: `username@servername`

## 📝 Configuration Reference

### Windows Authentication (Local)
```env
DB_SERVER=localhost
DB_DATABASE=StoreFeeder
DB_USER=
DB_PASSWORD=
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### SQL Server Authentication
```env
DB_SERVER=localhost
DB_DATABASE=StoreFeeder
DB_USER=sa
DB_PASSWORD=YourStrongPassword
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Named Instance
```env
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=StoreFeeder
```

### Azure SQL
```env
DB_SERVER=yourserver.database.windows.net
DB_DATABASE=StoreFeeder
DB_USER=yourusername
DB_PASSWORD=YourPassword
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

## ✅ Verification

After setup, restart your IDE and try:

```
You: "List all tables in the database"
Copilot: [Shows all tables with row counts]
```

If this works, you're all set! 🎉

## 📚 Full Documentation

See `README.md` for complete documentation including:
- All tool parameters
- SQL query examples
- Advanced usage scenarios
- Security best practices

---

**Need Help?**

1. Check connection settings in `.env`
2. Review README.md for troubleshooting
3. Verify SQL Server is accessible
4. Test connection using the test command in setup script

**Current Configuration**:
- Server: `localhost` (Windows Authentication)
- Database: `StoreFeeder`
- Files created in: `<project-directory>`
