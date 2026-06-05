import { createApp } from "../server";

let app: any = null;

export default async (req: any, res: any) => {
  if (!app) {
    app = await createApp();
  }
  return app(req, res);
};
