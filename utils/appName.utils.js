const { EAppName } = require('./commonVars');

class AppNameUtils {
  static appName;

  static validateAppName() {
    const tAppName = process.argv[2];

    if (!tAppName) {
      throw new Error('App Name is required in process.argv');
    }

    if (!Object.values(EAppName).includes(tAppName)) {
      throw new Error(`App Name must be in ${Object.values(EAppName)}`);
    }

    this.appName = tAppName;
    return this.appName;
  }

  static getAppName() {
    if (this.appName) return this.appName;
    return this.validateAppName();
  }
}

module.exports = AppNameUtils;
