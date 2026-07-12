-- AssetFlow schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TYPE user_role AS ENUM ('Admin', 'AssetManager', 'DepartmentHead', 'Employee');
CREATE TYPE user_status AS ENUM ('Active', 'Suspended');
CREATE TYPE asset_status AS ENUM ('Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed');
CREATE TYPE allocation_status AS ENUM ('Active', 'Returned', 'Cancelled');
CREATE TYPE transfer_status AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE booking_status AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');
CREATE TYPE maintenance_status AS ENUM ('Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved');
CREATE TYPE maintenance_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE audit_status AS ENUM ('Planned', 'In Progress', 'Closed');
CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Missing', 'Damaged');

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  parent_id INT REFERENCES departments(id) ON DELETE SET NULL,
  head_user_id INT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'Employee',
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'Active',
  refresh_token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE asset_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  meta_json JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category_id INT REFERENCES asset_categories(id) ON DELETE SET NULL,
  serial_number VARCHAR(120),
  acquisition_date DATE,
  acquisition_cost NUMERIC(12,2),
  condition VARCHAR(50) DEFAULT 'Good',
  location VARCHAR(150),
  status asset_status NOT NULL DEFAULT 'Available',
  shared_bookable BOOLEAN DEFAULT FALSE,
  current_holder_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  current_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_search ON assets USING gin (to_tsvector('english', name || ' ' || asset_tag));

CREATE TABLE asset_attachments (
  id SERIAL PRIMARY KEY,
  asset_id INT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE allocations (
  id SERIAL PRIMARY KEY,
  asset_id INT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  allocated_to_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  allocated_to_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  allocated_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  expected_return_date DATE,
  actual_return_date DATE,
  status allocation_status NOT NULL DEFAULT 'Active',
  condition_on_return VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Only one Active allocation per asset at a time
CREATE UNIQUE INDEX uq_one_active_allocation_per_asset ON allocations(asset_id) WHERE (status = 'Active');

CREATE TABLE transfer_requests (
  id SERIAL PRIMARY KEY,
  asset_id INT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  requested_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  requested_to_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  requested_to_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  approved_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  status transfer_status NOT NULL DEFAULT 'Pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  resource_name VARCHAR(150) NOT NULL,
  asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'Upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_booking_time CHECK (end_time > start_time)
);
-- Database-level guarantee: no overlapping bookings for the same asset (active statuses only)
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    asset_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('Upcoming', 'Ongoing'));

CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  asset_id INT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  raised_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  priority maintenance_priority NOT NULL DEFAULT 'Medium',
  issue_description TEXT NOT NULL,
  status maintenance_status NOT NULL DEFAULT 'Pending',
  technician_name VARCHAR(120),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audits (
  id SERIAL PRIMARY KEY,
  scope_type VARCHAR(30) NOT NULL,
  scope_value VARCHAR(150),
  start_date DATE NOT NULL,
  end_date DATE,
  status audit_status NOT NULL DEFAULT 'Planned',
  created_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_items (
  id SERIAL PRIMARY KEY,
  audit_id INT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  asset_id INT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  auditor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  verification_status verification_status NOT NULL DEFAULT 'Pending',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (audit_id, asset_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_status);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments','users','asset_categories','assets','allocations',
    'transfer_requests','bookings','maintenance_requests','audits','audit_items']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
