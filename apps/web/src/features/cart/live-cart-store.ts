import { useSyncExternalStore } from "react";
import type { PersistentCartProps } from "../ai/tambo-schemas";

type BranchCartMap = Record<string, PersistentCartProps>;

const CART_ID = "cart-main";

let branchCarts: BranchCartMap = {};
const emptyBranchCarts = new Map<string, PersistentCartProps>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function createEmptyBranchCart(branchName: string): PersistentCartProps {
  return {
    cartId: CART_ID,
    branchName,
    items: [],
    subtotalCents: 0,
    taxCents: 0,
    totalCents: 0,
  };
}

function getEmptyBranchCartSnapshot(branchCode: string, branchName: string) {
  const cachedCart = emptyBranchCarts.get(branchCode);

  if (cachedCart && cachedCart.branchName === branchName) {
    return cachedCart;
  }

  const nextCart = createEmptyBranchCart(branchName);
  emptyBranchCarts.set(branchCode, nextCart);
  return nextCart;
}

export function getLiveBranchCart(branchCode: string, branchName: string) {
  return branchCarts[branchCode] ?? getEmptyBranchCartSnapshot(branchCode, branchName);
}

export function setLiveBranchCart(branchCode: string, cart: PersistentCartProps) {
  branchCarts = {
    ...branchCarts,
    [branchCode]: cart,
  };
  emitChange();
}

export function clearLiveBranchCart(branchCode: string, branchName: string) {
  setLiveBranchCart(branchCode, createEmptyBranchCart(branchName));
}

export function resetLiveCartStore() {
  branchCarts = {};
  emptyBranchCarts.clear();
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useLiveBranchCart(branchCode: string, branchName: string) {
  return useSyncExternalStore(
    subscribe,
    () => getLiveBranchCart(branchCode, branchName),
    () => getLiveBranchCart(branchCode, branchName),
  );
}
