
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "madar_crm",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "MADAR CRM Backend is running",
    version: "1.0.0",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "MADAR CRM API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/database-test", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database_name"
    );
    res.json({
      success: true,
      database: result.rows[0].database_name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

function validId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateCustomer(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.name !== "string" ||
    !data.name.trim() ||
    data.name.trim().length > 150
  ) {
    return null;
  }

  const company = data.company ?? "";
  const phone = data.phone ?? "";
  const status = data.status ?? "نشط";

  if (
    typeof company !== "string" ||
    company.length > 150 ||
    typeof phone !== "string" ||
    phone.length > 30 ||
    typeof status !== "string" ||
    !status.trim() ||
    status.length > 30
  ) {
    return null;
  }

  return {
    name: data.name.trim(),
    company: company.trim(),
    phone: phone.trim(),
    status: status.trim(),
  };
}

// عرض جميع العملاء
app.get("/api/customers", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM customers ORDER BY id DESC"
    );
    res.json({ success: true, customers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
});

// إضافة عميل
app.post("/api/customers", async (req, res) => {
  const customer = validateCustomer(req.body);

  if (!customer) {
    res.status(400).json({
      success: false,
      message: "Invalid customer data",
    });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO customers (name, company, phone, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        customer.name,
        customer.company,
        customer.phone,
        customer.status,
      ]
    );

    res.status(201).json({
      success: true,
      customer: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
});

// تعديل عميل
app.put("/api/customers/:id", async (req, res) => {
  const id = validId(req.params.id as string);
  const customer = validateCustomer(req.body);

  if (!id || !customer) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID or data",
    });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE customers
       SET name = $1, company = $2, phone = $3, status = $4
       WHERE id = $5
       RETURNING *`,
      [
        customer.name,
        customer.company,
        customer.phone,
        customer.status,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    res.json({
      success: true,
      customer: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
});

// حذف عميل
app.delete("/api/customers/:id", async (req, res) => {
  const id = validId(req.params.id as string);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM customers WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
});

app.get("/api/deals", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.title,
        d.customer_id AS "customerId",
        c.name AS "customerName",
        d.value,
        d.stage,
        d.deal_date AS "date",
        d.created_at AS "createdAt"
      FROM deals d
      LEFT JOIN customers c ON c.id = d.customer_id
      ORDER BY d.id DESC
    `);

    res.json({
      success: true,
      deals: result.rows.map((deal) => ({
        ...deal,
        value: Number(deal.value),
        date: deal.date
          ? new Date(deal.date).toISOString().slice(0, 10)
          : "",
      })),
    });
  } catch (error) {
    console.error("Failed to fetch deals:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch deals",
    });
  }
});

function validateDeal(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.title !== "string" ||
    !data.title.trim() ||
    data.title.trim().length > 200
  ) {
    return null;
  }

  const customerId = Number(data.customerId);
  const value = Number(data.value);

  if (
    !Number.isSafeInteger(customerId) ||
    customerId <= 0 ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 9999999999.99
  ) {
    return null;
  }

  const allowedStages = [
    "عميل محتمل",
    "تفاوض",
    "عرض سعر",
    "مكتملة",
    "خاسرة",
  ];

  if (
    typeof data.stage !== "string" ||
    !allowedStages.includes(data.stage)
  ) {
    return null;
  }

  if (
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
  ) {
    return null;
  }

  const parsedDate = new Date(`${data.date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== data.date
  ) {
    return null;
  }

  return {
    title: data.title.trim(),
    customerId,
    value,
    stage: data.stage,
    date: data.date,
  };
}

// إضافة صفقة جديدة
app.post("/api/deals", async (req, res) => {
  const deal = validateDeal(req.body);

  if (!deal) {
    res.status(400).json({
      success: false,
      message: "Invalid deal data",
    });
    return;
  }

  try {
    const customer = await pool.query(
      "SELECT id FROM customers WHERE id = $1",
      [deal.customerId]
    );

    if (customer.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Customer does not exist",
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO deals
       (title, customer_id, value, stage, deal_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        deal.title,
        deal.customerId,
        deal.value,
        deal.stage,
        deal.date,
      ]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: "Deal created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create deal",
    });
  }
});

// تعديل صفقة
app.put("/api/deals/:id", async (req, res) => {
  const id = validId(req.params.id as string);
  const deal = validateDeal(req.body);

  if (!id || !deal) {
    res.status(400).json({
      success: false,
      message: "Invalid deal ID or data",
    });
    return;
  }

  try {
    const customer = await pool.query(
      "SELECT id FROM customers WHERE id = $1",
      [deal.customerId]
    );

    if (customer.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Customer does not exist",
      });
      return;
    }

    const result = await pool.query(
      `UPDATE deals
       SET title = $1,
           customer_id = $2,
           value = $3,
           stage = $4,
           deal_date = $5
       WHERE id = $6
       RETURNING id`,
      [
        deal.title,
        deal.customerId,
        deal.value,
        deal.stage,
        deal.date,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Deal updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update deal",
    });
  }
});

// حذف صفقة
app.delete("/api/deals/:id", async (req, res) => {
  const id = validId(req.params.id as string);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid deal ID",
    });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM deals WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Deal deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete deal",
    });
  }
});

app.get("/api/employees", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        job_title AS "role",
        email,
        phone,
        department,
        status,
        created_at AS "createdAt"
      FROM employees
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      employees: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch employees:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
});

function validateEmployee(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const data = body as Record<string, unknown>;

  const name = data.name;
  const role = data.role;
  const department = data.department;
  const email = data.email ?? "";
  const phone = data.phone ?? "";
  const status = data.status ?? "نشط";

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 150 ||
    typeof role !== "string" ||
    !role.trim() ||
    role.trim().length > 150 ||
    typeof department !== "string" ||
    !department.trim() ||
    department.trim().length > 100 ||
    typeof email !== "string" ||
    email.length > 150 ||
    typeof phone !== "string" ||
    phone.length > 30 ||
    typeof status !== "string" ||
    !["نشط", "إجازة", "غير نشط"].includes(status)
  ) {
    return null;
  }

  return {
    name: name.trim(),
    role: role.trim(),
    department: department.trim(),
    email: email.trim(),
    phone: phone.trim(),
    status,
  };
}

// إضافة موظف
app.post("/api/employees", async (req, res) => {
  const employee = validateEmployee(req.body);

  if (!employee) {
    res.status(400).json({
      success: false,
      message: "Invalid employee data",
    });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees
       (name, job_title, department, email, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        employee.name,
        employee.role,
        employee.department,
        employee.email,
        employee.phone,
        employee.status,
      ]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: "Employee created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
});

// تعديل موظف
app.put("/api/employees/:id", async (req, res) => {
  const id = validId(req.params.id as string);
  const employee = validateEmployee(req.body);

  if (!id || !employee) {
    res.status(400).json({
      success: false,
      message: "Invalid employee ID or data",
    });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE employees
       SET name = $1,
           job_title = $2,
           department = $3,
           email = $4,
           phone = $5,
           status = $6
       WHERE id = $7
       RETURNING id`,
      [
        employee.name,
        employee.role,
        employee.department,
        employee.email,
        employee.phone,
        employee.status,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update employee",
    });
  }
});

// حذف موظف
app.delete("/api/employees/:id", async (req, res) => {
  const id = validId(req.params.id as string);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid employee ID",
    });
    return;
  }

  try {
    // لا نحذف موظفًا لديه مهام مرتبطة به
    const tasks = await pool.query(
      "SELECT 1 FROM tasks WHERE employee_id = $1 LIMIT 1",
      [id]
    );

    if (tasks.rowCount !== 0) {
      res.status(409).json({
        success: false,
        message: "Employee has assigned tasks",
      });
      return;
    }

    const result = await pool.query(
      "DELETE FROM employees WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete employee",
    });
  }
});

app.get("/api/tasks", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.employee_id AS "employeeId",
        e.name AS "employeeName",
        t.customer_id AS "customerId",
        c.name AS "customerName",
        t.deal_id AS "dealId",
        d.title AS "dealName",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') AS "dueDate",
        t.priority,
        t.status,
        t.created_at AS "createdAt"
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      LEFT JOIN customers c ON c.id = t.customer_id
      LEFT JOIN deals d ON d.id = t.deal_id
      ORDER BY t.id DESC
    `);

    res.json({
      success: true,
      tasks: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

type TaskInput = {
  title: string;
  description: string;
  employeeId: number;
  customerId: number | null;
  dealId: number | null;
  dueDate: string;
  priority: string;
  status: string;
};

function validateTask(body: unknown): TaskInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const data = body as Record<string, unknown>;

  const title = data.title;
  const description = data.description ?? "";
  const employeeId = data.employeeId;
  const customerId = data.customerId ?? null;
  const dealId = data.dealId ?? null;
  const dueDate = data.dueDate;
  const priority = data.priority;
  const status = data.status;

  const validOptionalId = (value: unknown) =>
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value > 0);

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 200 ||
    typeof description !== "string" ||
    typeof employeeId !== "number" ||
    !Number.isSafeInteger(employeeId) ||
    employeeId <= 0 ||
    !validOptionalId(customerId) ||
    !validOptionalId(dealId) ||
    typeof dueDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    !["منخفضة", "متوسطة", "عالية"].includes(String(priority)) ||
    !["لم تبدأ", "قيد التنفيذ", "مكتملة"].includes(String(status))
  ) {
    return null;
  }

  const date = new Date(`${dueDate}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dueDate
  ) {
    return null;
  }

  return {
    title: title.trim(),
    description: description.trim(),
    employeeId,
    customerId: customerId as number | null,
    dealId: dealId as number | null,
    dueDate,
    priority: priority as string,
    status: status as string,
  };
}

async function checkTaskRelations(task: TaskInput) {
  const employee = await pool.query(
    "SELECT id FROM employees WHERE id = $1",
    [task.employeeId]
  );

  if (employee.rowCount === 0) {
    return "Employee does not exist";
  }

  if (task.customerId !== null) {
    const customer = await pool.query(
      "SELECT id FROM customers WHERE id = $1",
      [task.customerId]
    );

    if (customer.rowCount === 0) {
      return "Customer does not exist";
    }
  }

  if (task.dealId !== null) {
    const deal = await pool.query(
      "SELECT customer_id FROM deals WHERE id = $1",
      [task.dealId]
    );

    if (deal.rowCount === 0) {
      return "Deal does not exist";
    }

    if (
      task.customerId !== null &&
      deal.rows[0].customer_id !== task.customerId
    ) {
      return "Deal belongs to another customer";
    }
  }

  return null;
}

// إضافة مهمة
app.post("/api/tasks", async (req, res) => {
  const task = validateTask(req.body);

  if (!task) {
    res.status(400).json({
      success: false,
      message: "Invalid task data",
    });
    return;
  }

  try {
    const relationError = await checkTaskRelations(task);

    if (relationError) {
      res.status(400).json({
        success: false,
        message: relationError,
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO tasks
       (title, description, employee_id, customer_id,
        deal_id, due_date, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        task.title,
        task.description,
        task.employeeId,
        task.customerId,
        task.dealId,
        task.dueDate,
        task.priority,
        task.status,
      ]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: "Task created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
});

// تعديل مهمة
app.put("/api/tasks/:id", async (req, res) => {
  const id = validId(req.params.id as string);
  const task = validateTask(req.body);

  if (!id || !task) {
    res.status(400).json({
      success: false,
      message: "Invalid task ID or data",
    });
    return;
  }

  try {
    const relationError = await checkTaskRelations(task);

    if (relationError) {
      res.status(400).json({
        success: false,
        message: relationError,
      });
      return;
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           employee_id = $3,
           customer_id = $4,
           deal_id = $5,
           due_date = $6,
           priority = $7,
           status = $8
       WHERE id = $9
       RETURNING id`,
      [
        task.title,
        task.description,
        task.employeeId,
        task.customerId,
        task.dealId,
        task.dueDate,
        task.priority,
        task.status,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
});

// حذف مهمة
app.delete("/api/tasks/:id", async (req, res) => {
  const id = validId(req.params.id as string);

  if (!id) {
    res.status(400).json({
      success: false,
      message: "Invalid task ID",
    });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

app.listen(PORT, () => {
  console.log(`MADAR CRM API running at http://localhost:${PORT}`);
});
