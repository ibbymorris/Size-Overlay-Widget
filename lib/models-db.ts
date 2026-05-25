import fs from 'fs/promises';
import path from 'path';

export interface ModelEntity {
  id: string;
  codename: string;
  estimatedHeight: string;
  visualDescription: string;
}

const DB_FILE = path.join(process.cwd(), 'models-db.json');

export async function getModels(): Promise<ModelEntity[]> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function addModel(model: ModelEntity): Promise<void> {
  const models = await getModels();
  models.push(model);
  await fs.writeFile(DB_FILE, JSON.stringify(models, null, 2));
}

export async function removeModels(): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
}

export async function deleteModel(id: string): Promise<void> {
  const models = await getModels();
  const filtered = models.filter(m => m.id !== id);
  await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
}

export async function updateModel(updatedModel: ModelEntity): Promise<void> {
  const models = await getModels();
  const index = models.findIndex(m => m.id === updatedModel.id);
  if (index !== -1) {
    models[index] = updatedModel;
    await fs.writeFile(DB_FILE, JSON.stringify(models, null, 2));
  } else {
    throw new Error('Model not found');
  }
}
