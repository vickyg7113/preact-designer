import type { Guide, StorageData } from '../types';

const DEFAULT_STORAGE_KEY = 'visual-designer-guides';
const STORAGE_VERSION = '1.0.0';

/**
 * Storage abstraction layer
 */
export class Storage {
  private storageKey: string;

  constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  getGuides(): Guide[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsed: StorageData = JSON.parse(data);
      if (parsed.version !== STORAGE_VERSION) {
        this.clear();
        return [];
      }
      return parsed.guides || [];
    } catch {
      return [];
    }
  }

  getGuidesByPage(page: string): Guide[] {
    const guides = this.getGuides();
    return guides.filter((g) => g.page === page && g.status === 'active');
  }

  saveGuide(guide: Guide): void {
    const guides = this.getGuides();
    const existingIndex = guides.findIndex((g) => g.id === guide.id);
    const updated: Guide = {
      ...guide,
      updatedAt: new Date().toISOString(),
      createdAt: guide.createdAt || new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      guides[existingIndex] = updated;
    } else {
      guides.push(updated);
    }
    this.saveGuides(guides);
  }

  deleteGuide(guideId: string): void {
    const guides = this.getGuides().filter((g) => g.id !== guideId);
    this.saveGuides(guides);
  }

  private saveGuides(guides: Guide[]): void {
    const data: StorageData = { guides, version: STORAGE_VERSION };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  getGuide(guideId: string): Guide | null {
    return this.getGuides().find((g) => g.id === guideId) || null;
  }
}
