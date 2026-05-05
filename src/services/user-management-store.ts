import { Injectable } from '@angular/core';

export type UserRole = 'Admin' | 'Operator';

export interface UserRecord {
  id: number;
  username: string;
  password: string;
  role: UserRole;
}

export type UserUpsertPayload = Omit<UserRecord, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class UserManagementStore {
  private readonly storageKey = 'mahindra.user.management.records';

  getUsers(): UserRecord[] {
    const fromStorage = this.read();
    if (fromStorage.length) {
      return fromStorage;
    }

    const seed: UserRecord[] = [
      {
        id: 1,
        username: 'Admin',
        password: 'Admin',
        role: 'Admin',
      },
    ];
    this.write(seed);
    return seed;
  }

  addUser(payload: UserUpsertPayload): UserRecord {
    const list = this.getUsers();
    const nextId = list.length ? Math.max(...list.map((user) => user.id)) + 1 : 1;
    const created: UserRecord = { id: nextId, ...payload };
    const nextList = [...list, created];
    this.write(nextList);
    return created;
  }

  updateUser(id: number, payload: UserUpsertPayload): UserRecord | null {
    const list = this.getUsers();
    const index = list.findIndex((user) => user.id === id);
    if (index === -1) {
      return null;
    }

    const updated: UserRecord = { id, ...payload };
    const nextList = [...list];
    nextList[index] = updated;
    this.write(nextList);
    return updated;
  }

  deleteUser(id: number): boolean {
    const list = this.getUsers();
    const nextList = list.filter((user) => user.id !== id);
    if (nextList.length === list.length) {
      return false;
    }
    this.write(nextList);
    return true;
  }

  private read(): UserRecord[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => this.toUserRecord(item))
        .filter((item): item is UserRecord => item !== null);
    } catch {
      return [];
    }
  }

  private write(users: UserRecord[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  private toUserRecord(item: unknown): UserRecord | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const user = item as Partial<UserRecord>;
    const normalizedRole = this.normalizeRole(user.role);

    if (
      typeof user.id !== 'number' ||
      typeof user.username !== 'string' ||
      typeof user.password !== 'string' ||
      !normalizedRole
    ) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      password: user.password,
      role: normalizedRole,
    };
  }

  private normalizeRole(role: unknown): UserRole | null {
    if (typeof role !== 'string') {
      return null;
    }

    const value = role.trim().toLowerCase();
    if (value === 'admin' || value === 'supervisor') {
      return 'Admin';
    }
    if (value === 'operator' || value === 'user') {
      return 'Operator';
    }

    return null;
  }
}
