const bcrypt = require("bcrypt");

const hashPassword = async (plain) => {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
};

const verifyPassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = { hashPassword, verifyPassword };
