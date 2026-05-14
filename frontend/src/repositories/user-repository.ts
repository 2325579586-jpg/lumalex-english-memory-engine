import { db } from "@/lib/db";
import type { AppUser } from "@/types/domain";

export const userRepository = {
  async list() {
    return db.users.orderBy("createdAt").reverse().toArray();
  },
  async getById(id: string) {
    return db.users.get(id);
  },
  async getByUsername(username: string) {
    return db.users.where("username").equals(username).first();
  },
  async put(user: AppUser) {
    await db.users.put(user);
  },
};
