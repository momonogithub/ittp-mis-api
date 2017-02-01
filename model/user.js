export const userModel = [
  'username',
  'password',
  'createdDate',
  'lastLoginDate',
]

export const userType = [
  'VARCHAR(20) NOT NULL',
  'CHAR(60) NOT NULL',
  'DATETIME NOT NULL',
  'DATETIME',
]

export const userUnique = [
  'username',
]