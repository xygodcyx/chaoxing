export default class Singleton {
  private static _instance: any = null;
  public static get Instance() {
    return this.GetInstance();
  }
  protected static GetInstance<T>() {
    if (!this._instance) {
      this._instance = new this();
    }
    return this._instance as T;
  }
}
