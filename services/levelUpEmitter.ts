/**
 * LevelUpEmitter — simple event bus pour déclencher la cinématique level-up
 * depuis n'importe quel écran sans prop drilling.
 *
 * Usage :
 *   import { levelUpEmitter } from '../services/levelUpEmitter';
 *   levelUpEmitter.emit('levelUp', { newLevel: 5 });
 */

export interface LevelUpEvent {
  newLevel: number;
}

type EventMap = {
  levelUp: LevelUpEvent;
};

type Listener<T> = (payload: T) => void;

class SimpleEmitter {
  private listeners: Partial<{ [K in keyof EventMap]: Listener<EventMap[K]>[] }> = {};

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<EventMap[K]>[]).push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners[event] = (this.listeners[event] as Listener<EventMap[K]>[])?.filter(l => l !== listener);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    (this.listeners[event] as Listener<EventMap[K]>[])?.forEach(l => l(payload));
  }
}

export const levelUpEmitter = new SimpleEmitter();
