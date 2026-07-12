-- Passwords below are bcrypt hashes of "Passw0rd!" (cost 10)
INSERT INTO departments (name) VALUES ('Admin'), ('IT'), ('HR'), ('Operations'), ('Finance');

INSERT INTO users (name, email, password_hash, role, department_id) VALUES
  ('Ava Admin',    'admin@assetflow.io',    '$2a$10$1I4MtC2UdVvRlCNAOhIze./1s6O/rb6gNj1v9znvgzobMyzTNlvQm', 'Admin', 1),
  ('Miles Manager','manager@assetflow.io',  '$2a$10$1I4MtC2UdVvRlCNAOhIze./1s6O/rb6gNj1v9znvgzobMyzTNlvQm', 'AssetManager', 2),
  ('Hana Head',    'head@assetflow.io',     '$2a$10$1I4MtC2UdVvRlCNAOhIze./1s6O/rb6gNj1v9znvgzobMyzTNlvQm', 'DepartmentHead', 2),
  ('Priya Sharma', 'employee@assetflow.io', '$2a$10$1I4MtC2UdVvRlCNAOhIze./1s6O/rb6gNj1v9znvgzobMyzTNlvQm', 'Employee', 2),
  ('Raj Patel',    'raj@assetflow.io',      '$2a$10$1I4MtC2UdVvRlCNAOhIze./1s6O/rb6gNj1v9znvgzobMyzTNlvQm', 'Employee', 2);

UPDATE departments SET head_user_id = 3 WHERE id = 2;

INSERT INTO asset_categories (name, description) VALUES
  ('Electronics', 'Laptops, monitors, phones'),
  ('Furniture', 'Desks, chairs'),
  ('Vehicles', 'Company vehicles'),
  ('Tools', 'Hand and power tools'),
  ('Rooms', 'Bookable meeting rooms');

INSERT INTO assets (asset_tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, shared_bookable) VALUES
  ('AF-0001', 'Laptop Dell XPS 15', 1, 'SN-DL-001', '2024-01-15', 1800.00, 'Good', 'IT Store', FALSE),
  ('AF-0002', 'Projector Epson EB-X05', 1, 'SN-EP-002', '2023-06-10', 450.00, 'Good', 'Store Room', FALSE),
  ('AF-0003', 'Meeting Room B2', 5, NULL, NULL, NULL, 'Good', 'Floor 2', TRUE),
  ('AF-0004', 'Office Chair Herman Miller', 2, 'SN-HM-004', '2022-03-01', 700.00, 'Fair', 'Floor 3', FALSE),
  ('AF-0005', 'Company Car - Toyota Corolla', 3, 'SN-TC-005', '2021-11-20', 22000.00, 'Good', 'Basement Parking', TRUE);

-- Priya (id 4) currently holds the laptop, to demo the conflict/transfer flow
INSERT INTO allocations (asset_id, allocated_to_user_id, allocated_to_department_id, allocated_by_user_id, expected_return_date, status)
VALUES (1, 4, 2, 2, CURRENT_DATE + INTERVAL '30 days', 'Active');

UPDATE assets SET status = 'Allocated', current_holder_user_id = 4, current_department_id = 2 WHERE id = 1;
