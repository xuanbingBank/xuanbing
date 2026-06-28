-- migration: 0002_auth
-- 创建用户、角色、会话表,支持本地鉴权

-- users:本地账号与凭据
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT,
  roles TEXT NOT NULL DEFAULT '[]',
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- roles:角色到权限的映射
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- user_sessions:登录会话 token
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- 默认角色
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
  ('role-admin', 'admin', '管理员', '["*"]'),
  ('role-user', 'user', '普通用户', '["app:read","window:open","window:close","setting:read","taskData:read","taskData:write","file:read"]');
