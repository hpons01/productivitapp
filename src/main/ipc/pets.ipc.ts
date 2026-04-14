import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  getAllPets,
  getUnhatchedEggs,
  equipPet,
  unequipAll,
  hatchEgg,
  renamePet,
  getEquippedPet
} from '../db/queries/pets.queries'

export function registerPetsIpc(): void {
  ipcMain.handle('pets:list', () => {
    const db = getDb()
    return getAllPets(db)
  })

  ipcMain.handle('pets:eggs', () => {
    const db = getDb()
    return getUnhatchedEggs(db)
  })

  ipcMain.handle('pets:equip', (_event, petId: string) => {
    const db = getDb()
    equipPet(db, petId)
    return { success: true }
  })

  ipcMain.handle('pets:unequip', () => {
    const db = getDb()
    unequipAll(db)
    return { success: true }
  })

  ipcMain.handle('pets:hatchEgg', (_event, eggId: string) => {
    const db = getDb()
    const result = hatchEgg(db, eggId)
    if (!result) return { success: false, error: 'Egg not found or already hatched' }
    return { success: true, pet: result.pet, egg: result.egg }
  })

  ipcMain.handle('pets:rename', (_event, petId: string, name: string) => {
    const db = getDb()
    renamePet(db, petId, name)
    return { success: true }
  })

  ipcMain.handle('pets:getEquipped', () => {
    const db = getDb()
    return getEquippedPet(db)
  })
}
