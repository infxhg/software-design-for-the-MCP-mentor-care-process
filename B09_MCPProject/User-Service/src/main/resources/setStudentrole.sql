INSERT INTO sys_user_role (user_id, role_id)
SELECT '44e96c933a05e3823bf2ecfccf8b0f08', id
FROM sys_role
WHERE role_code = 'STUDENT';



