Let’s now build a **complete, production-ready hierarchical permission system** from scratch, with:

- MongoDB models (`User`, `Role`)
- Configurable permissions (view + actions)
- Context-based scopes (self, ownChildren, etc.)
- A reusable permission checker function

---

## 🧱 1. Role & Permission Design

We'll make the **`Role` model** the central point of control.

Each role will have:

- `name` (e.g., “Service Lead”)
- `level` (numeric hierarchy)
- `parentRole` (optional)
- `permissions` array

  - each `permission` has:

    - `module`: e.g. `"Timesheet"`
    - `actions`: array of objects, each defining:

      - `name`: e.g. `"read"`, `"update"`, `"delete"`
      - `scope`: defines _whose data_ this action applies to

---

### 🧩 Role Model (`models/Role.js`)

```js
import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["create", "read", "update", "delete", "approve", "assign"],
    required: true,
  },
  scope: {
    type: String,
    enum: ["self", "ownChildren", "sameLevelChildren", "organization"],
    default: "self",
  },
});

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true }, // e.g. "ServiceData"
  actions: [actionSchema],
});

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  level: { type: Number, required: true },
  parentRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
  permissions: [permissionSchema],
});

export const Role = mongoose.model("Role", roleSchema);
```

---

## 👤 2. User Model (`models/User.js`)

Each user:

- Has one or more roles.
- Optionally belongs to a manager (used for hierarchy resolution).

```js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // parent user
});

export const User = mongoose.model("User", userSchema);
```

---

## ⚙️ 3. Example Role Documents

Let’s see how permissions will look in the database:

### Service Lead (Level 5)

```js
{
  name: "Service Lead",
  level: 5,
  permissions: [
    {
      module: "Timesheet",
      actions: [
        { name: "read", scope: "sameLevelChildren" },
        { name: "update", scope: "ownChildren" },
        { name: "delete", scope: "self" }
      ]
    }
  ]
}
```

### Service Engineer (Level 6)

```js
{
  name: "Service Engineer",
  level: 6,
  permissions: [
    {
      module: "ServiceData",
      actions: [
        { name: "read", scope: "self" },
        { name: "update", scope: "self" }
      ]
    }
  ]
}
```

---

## 🧩 4. Core Permission Check Logic for writing operations

This function:

- Checks if a **user has a given action** permission for a module.
- Validates **data scope** (self / ownChildren / sameLevelChildren / organization/ sameLevel).

### `utils/checkPermission.js`

```js
import { User } from "../models/User.js";

export const canPerformAction = async (actorId, targetId, module, action) => {
  const actor = await User.findById(actorId).populate("role");
  const target = await User.findById(targetId).populate("role");

  if (!actor || !target) throw new Error("User not found");

  const role = actor.role;

  // 1️⃣ Find permission for the module
  const modulePerm = role.permissions.find((p) => p.module === module);
  if (!modulePerm) return false;

  // 2️⃣ Find specific action in that module
  const actionPerm = modulePerm.actions.find((a) => a.name === action);
  if (!actionPerm) return false;

  const scope = actionPerm.scope;

  // 3️⃣ Evaluate scope-based access
  switch (scope) {
    case "organization":
      return true;

    case "self":
      return actor._id.equals(target._id);

    case "ownChildren":
      return target.manager?.equals(actor._id);

    case "sameLevelChildren":
      // Check if both users have managers with the same parent
      const actorManager = actor.manager
        ? await User.findById(actor.manager)
        : null;
      const targetManager = target.manager
        ? await User.findById(target.manager)
        : null;

      if (!actorManager || !targetManager) return false;
      return actorManager._id.equals(targetManager._id);

    default:
      return false;
  }
};
```

---

## 🧰 5. Middleware for Express Routes

Let’s create a reusable middleware so you can protect routes cleanly.

### `middleware/authorize.js`

```js
import { canPerformAction } from "../utils/checkPermission.js";

export const authorize = (module, action) => {
  return async (req, res, next) => {
    try {
      const actorId = req.user._id;
      const targetId = req.params.id; // assuming target user ID comes from route

      const allowed = await canPerformAction(actorId, targetId, module, action);

      if (!allowed) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};
```

Now you can simply use:

```js
router.put("/user/:id", authorize("ServiceData", "update"), updateUser);
```

---

## 🧩 6. Controller Example

### `controllers/userController.js`

```js
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  const user = await User.findByIdAndUpdate(id, { name, email }, { new: true });

  res.json({ message: "User updated successfully", user });
};
```

The function `canPerformAction(actorId, targetId, module, action)` checks **for one target user at a time**.

But in practice (for example, when listing data or showing dashboards), you often need to show **multiple users’ data** — e.g.:

> “Service Lead wants to view all his engineers.”

So let’s handle this **properly and efficiently**, without checking one-by-one.

---

## ✅ For Single-Target Operations

The existing function:

```js
canPerformAction(actorId, targetId, module, action);
```

works perfectly.
You use it inside a route that deals with **one specific target** (e.g. update, delete, approve).

---

## ⚡ For Bulk (Multiple Users) Operations

You need a **query filter generator** that returns which users (or documents) the actor can access — based on their role’s _scope_.

This is much faster and scalable.

---

### 🧱 1. Create a “Scope Query Builder”

We’ll write a helper that returns a **MongoDB query object** for the actor’s allowed data scope.

```js
import { User } from "../models/User.js";

export const buildScopeQuery = async (actorId, module, action) => {
  const actor = await User.findById(actorId).populate("role");
  if (!actor) throw new Error("User not found");

  const role = actor.role;
  const modulePerm = role.permissions.find((p) => p.module === module);
  if (!modulePerm) return null;

  const actionPerm = modulePerm.actions.find((a) => a.name === action);
  if (!actionPerm) return null;

  const scope = actionPerm.scope;

  switch (scope) {
    case "organization":
      // Can see everyone
      return {};

    case "self":
      // Can see only themselves
      return { _id: actor._id };

    case "ownChildren":
      // Can see users whose manager is this actor
      return { manager: actor._id };

    case "sameLevelChildren":
      // Can see users whose  manager equals actor's manager
      const actorManager = actor.manager
        ? await User.findById(actor.manager)
        : null;
      if (!actorManager) return { _id: actor._id }; // fallback to self
      // Find all leads under same manager
      const siblingLeads = await User.find(
        { manager: actorManager._id },
        "_id"
      );
      return { manager: { $in: siblingLeads.map((u) => u._id) } };

    default:
      return { _id: actor._id };
  }
};
```

---

### 🧱 2. Use It in Your Controller

Example:

> "Get all service engineers that the current user is allowed to view"

```js
import { buildScopeQuery } from "../utils/buildScopeQuery.js";
import { User } from "../models/User.js";

export const getAccessibleUsers = async (req, res) => {
  try {
    const actorId = req.user._id;

    // Build scope query dynamically
    const filter = await buildScopeQuery(actorId, "ServiceData", "read");
    if (!filter) return res.status(403).json({ message: "No permission" });

    // Fetch users that match scope
    const users = await User.find(filter).populate("role");

    res.json({ count: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch data" });
  }
};
```

---
