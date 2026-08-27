/**
 * Recursively removes all `undefined` properties, functions, and symbols from any object or array
 * before sending to Firestore setDoc() or updateDoc().
 * 
 * Firestore strictly disallows `undefined` anywhere in document payloads (throwing:
 * "Function updateDoc() / setDoc() called with invalid data. Unsupported field value: undefined").
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) {
    return undefined as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    const result: any[] = [];
    for (const item of obj) {
      if (item !== undefined && typeof item !== "function" && typeof item !== "symbol") {
        const cleanedItem = cleanFirestoreData(item);
        if (cleanedItem !== undefined) {
          result.push(cleanedItem);
        }
      }
    }
    return result as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== "function" && typeof value !== "symbol") {
        const cleanedValue = cleanFirestoreData(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

