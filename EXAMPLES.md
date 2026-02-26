# Database MCP Server - StoreFeeder Examples

Practical examples for using the Database MCP server with your StoreFeeder database.

---

## 🎯 Common Queries

### Orders

**Get recent orders**:
```
"Show me the last 20 orders from the database"
→ SELECT TOP 20 * FROM Orders ORDER BY OrderDate DESC
```

**Find orders by customer**:
```
"Find all orders for customer with email 'john@example.com'"
→ Uses search_data on Orders table or custom query
```

**Get order details**:
```
"Get complete details for order 12345"
→ SELECT * FROM Orders WHERE OrderID = 12345
```

### Products

**List all products**:
```
"Show me all products in the database"
→ SELECT * FROM Products
```

**Search products**:
```
"Find products containing 'laptop'"
→ Uses search_data on Products table
```

**Get product with SKU**:
```
"Find product with SKU 'ABC-123'"
→ SELECT * FROM Products WHERE SKU = 'ABC-123'
```

### Customers

**Recent customers**:
```
"Show me customers created in the last 30 days"
→ SELECT * FROM Customers WHERE CreatedDate >= DATEADD(day, -30, GETDATE())
```

**Search customers**:
```
"Find customers with name containing 'Smith'"
→ Uses search_data on Customers table
```

### Channels

**List all channels**:
```
"What sales channels are configured?"
→ SELECT * FROM Channels
```

**Amazon listings**:
```
"Show me all Amazon product listings"
→ Query from channel-specific tables
```

### Shipping

**Shipping methods**:
```
"List all shipping methods"
→ SELECT * FROM ShippingMethods
```

**Royal Mail settings**:
```
"Show Royal Mail courier configuration"
→ SELECT * FROM Couriers WHERE CourierName LIKE '%Royal Mail%'
```

---

## 🔍 Schema Exploration

### Understand Database Structure

**List all tables**:
```
"What tables are in the StoreFeeder database?"
→ Uses list_tables
```

**Examine specific table**:
```
"Describe the Orders table"
→ Uses describe_table to show:
  - All columns and data types
  - Primary keys
  - Indexes
  - Constraints
```

**Find relationships**:
```
"Show me all foreign keys for the Products table"
→ Uses get_table_relationships
```

**Table sizes**:
```
"Which tables have the most data?"
→ Uses list_tables and sorts by RowCount
```

---

## 📊 Analytics Queries

### Order Statistics

**Orders by status**:
```sql
SELECT 
    OrderStatus,
    COUNT(*) as OrderCount,
    SUM(TotalAmount) as TotalValue
FROM Orders
GROUP BY OrderStatus
ORDER BY OrderCount DESC
```

**Daily order volume**:
```sql
SELECT 
    CAST(OrderDate AS DATE) as Date,
    COUNT(*) as Orders,
    SUM(TotalAmount) as Revenue
FROM Orders
WHERE OrderDate >= DATEADD(month, -1, GETDATE())
GROUP BY CAST(OrderDate AS DATE)
ORDER BY Date DESC
```

### Product Performance

**Top selling products**:
```sql
SELECT TOP 10
    p.ProductName,
    p.SKU,
    SUM(oi.Quantity) as TotalSold,
    SUM(oi.Quantity * oi.UnitPrice) as Revenue
FROM Products p
INNER JOIN OrderItems oi ON p.ProductID = oi.ProductID
INNER JOIN Orders o ON oi.OrderID = o.OrderID
WHERE o.OrderDate >= DATEADD(month, -3, GETDATE())
GROUP BY p.ProductID, p.ProductName, p.SKU
ORDER BY TotalSold DESC
```

**Low stock products**:
```sql
SELECT 
    ProductName,
    SKU,
    StockLevel,
    ReorderLevel
FROM Products
WHERE StockLevel <= ReorderLevel
ORDER BY StockLevel ASC
```

### Channel Performance

**Orders by channel**:
```sql
SELECT 
    c.ChannelName,
    COUNT(o.OrderID) as OrderCount,
    SUM(o.TotalAmount) as Revenue
FROM Orders o
INNER JOIN Channels c ON o.ChannelID = c.ChannelID
WHERE o.OrderDate >= DATEADD(month, -1, GETDATE())
GROUP BY c.ChannelID, c.ChannelName
ORDER BY Revenue DESC
```

---

## 🔧 Stored Procedures

### List Available Procedures

**All procedures**:
```
"List all stored procedures in the database"
→ Uses list_stored_procedures
```

**Procedures by schema**:
```
"Show me all dbo stored procedures"
→ Uses list_stored_procedures with schema filter
```

### View Procedure Code

**Get definition**:
```
"Show me the code for GetOrdersByCustomer procedure"
→ Uses get_stored_procedure_definition
```

### Execute Procedures

**Common StoreFeeder procedures** (examples):

```
"Execute GetOrdersByDateRange with start date '2025-01-01' and end date '2025-02-01'"
→ Uses execute_stored_procedure with parameters

"Run UpdateStockLevels for product ID 123"
→ Uses execute_stored_procedure

"Execute ProcessPendingOrders"
→ Uses execute_stored_procedure with no parameters
```

---

## 🔎 Advanced Searches

### Multi-Column Search

**Search across order fields**:
```
"Find orders containing 'expedited' in any field"
→ Uses search_data which searches all text columns
```

**Product search**:
```
"Search products for 'wireless' in name or description"
→ Uses search_data with specific columns
```

### Custom Searches

**Orders with specific conditions**:
```sql
SELECT o.*, c.CustomerName, c.Email
FROM Orders o
INNER JOIN Customers c ON o.CustomerID = c.CustomerID
WHERE o.OrderStatus = 'Pending'
  AND o.TotalAmount > 100
  AND o.OrderDate >= DATEADD(day, -7, GETDATE())
ORDER BY o.OrderDate DESC
```

**Products needing attention**:
```sql
SELECT 
    ProductName,
    SKU,
    StockLevel,
    CASE 
        WHEN StockLevel = 0 THEN 'Out of Stock'
        WHEN StockLevel <= ReorderLevel THEN 'Low Stock'
        ELSE 'OK'
    END as StockStatus
FROM Products
WHERE StockLevel <= ReorderLevel
   OR LastSoldDate < DATEADD(month, -6, GETDATE())
ORDER BY StockLevel ASC
```

---

## 🛠️ Data Management

### Check Data Quality

**Find duplicate SKUs**:
```sql
SELECT SKU, COUNT(*) as Count
FROM Products
GROUP BY SKU
HAVING COUNT(*) > 1
```

**Orders without items**:
```sql
SELECT o.*
FROM Orders o
LEFT JOIN OrderItems oi ON o.OrderID = oi.OrderID
WHERE oi.OrderItemID IS NULL
```

**Orphaned records**:
```sql
SELECT oi.*
FROM OrderItems oi
LEFT JOIN Orders o ON oi.OrderID = o.OrderID
WHERE o.OrderID IS NULL
```

### Bulk Operations

**Update multiple records**:
```sql
UPDATE Products
SET StockStatus = 'Available'
WHERE StockLevel > 0 AND StockStatus = 'Out of Stock'
```

**Delete old data**:
```sql
DELETE FROM OrderLog
WHERE LogDate < DATEADD(year, -2, GETDATE())
```

---

## 📈 Reporting Queries

### Daily Summary

```sql
SELECT 
    CAST(OrderDate AS DATE) as Date,
    COUNT(*) as TotalOrders,
    SUM(TotalAmount) as Revenue,
    AVG(TotalAmount) as AverageOrderValue,
    COUNT(DISTINCT CustomerID) as UniqueCustomers
FROM Orders
WHERE OrderDate >= DATEADD(day, -30, GETDATE())
GROUP BY CAST(OrderDate AS DATE)
ORDER BY Date DESC
```

### Customer Insights

```sql
SELECT 
    c.CustomerID,
    c.CustomerName,
    c.Email,
    COUNT(o.OrderID) as TotalOrders,
    SUM(o.TotalAmount) as LifetimeValue,
    MAX(o.OrderDate) as LastOrderDate
FROM Customers c
LEFT JOIN Orders o ON c.CustomerID = o.CustomerID
GROUP BY c.CustomerID, c.CustomerName, c.Email
HAVING COUNT(o.OrderID) > 5
ORDER BY LifetimeValue DESC
```

### Inventory Report

```sql
SELECT 
    p.ProductName,
    p.SKU,
    p.StockLevel,
    p.ReorderLevel,
    ISNULL(SUM(oi.Quantity), 0) as SoldLast30Days,
    p.StockLevel / NULLIF(SUM(oi.Quantity), 0) as DaysOfStockRemaining
FROM Products p
LEFT JOIN OrderItems oi ON p.ProductID = oi.ProductID
LEFT JOIN Orders o ON oi.OrderID = o.OrderID AND o.OrderDate >= DATEADD(day, -30, GETDATE())
GROUP BY p.ProductID, p.ProductName, p.SKU, p.StockLevel, p.ReorderLevel
ORDER BY DaysOfStockRemaining ASC
```

---

## 💡 Tips for Using the Database MCP

### Natural Language Queries

You can ask Copilot in natural language, and it will use the appropriate tool:

- "Show me..." → Uses execute_query
- "List all..." → Uses list_tables or execute_query
- "Describe..." → Uses describe_table
- "Find..." → Uses search_data or execute_query
- "What tables..." → Uses list_tables
- "Execute procedure..." → Uses execute_stored_procedure

### Performance Considerations

**Use TOP or row limits**:
```
"Show me the first 100 orders" (better than "Show me all orders")
```

**Be specific with WHERE clauses**:
```
"Show orders from last week" (better than "Show all orders")
```

**Use indexes**:
```
"Describe Orders table" → Check which columns have indexes
```

### Safety

**Read before write**:
```
First: "Show me orders with status 'Pending'"
Then: "Update those orders to 'Processing'"
```

**Test on small datasets**:
```
"Show me 5 products where StockLevel < 10"
Before: "Update all products where StockLevel < 10"
```

---

## 🎓 Learning Your Schema

### Start with exploration:

1. **"List all tables"** - See what's available
2. **"Describe Orders table"** - Understand structure
3. **"Show relationships for Orders"** - See how tables connect
4. **"Show me 10 sample orders"** - See actual data
5. **"List stored procedures"** - See available business logic

### Build up complexity:

1. Simple: "Show me products"
2. Filtered: "Show me products with low stock"
3. Joined: "Show me products and their suppliers"
4. Aggregated: "Count products by category"
5. Complex: "Show top selling products by channel last month"

---

**Remember**: The database MCP server gives Copilot direct SQL access, so you can ask questions naturally and let it figure out the right queries and tools to use!

