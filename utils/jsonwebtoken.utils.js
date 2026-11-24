const jwt = require('jsonwebtoken');

async function getJwtTokenData(tokenData, days) {
  const reponseToken = await jwt.sign(
    { token: tokenData },
    process.env.SECRETKEY,
    {
      expiresIn: days,
    },
  );

  return reponseToken;
}
async function getDecodedJwtToken(token) {
  const decoded = await jwt.verify(token, process.env.SECRETKEY);
  return decoded;
}

async function getJwtTokenNoExpiryData(tokenData) {
  const reponseToken = await jwt.sign(
    { token: tokenData },
    process.env.SECRETKEY,
  );

  return reponseToken;
}
module.exports = {
  getJwtTokenData,
  getDecodedJwtToken,
  getJwtTokenNoExpiryData,
};
