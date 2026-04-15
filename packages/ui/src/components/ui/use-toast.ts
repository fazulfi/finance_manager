"use client";

import * as React from "react";

import type { ToastActionElement, ToastProps } from "./toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function addToRemoveQueue(toastId: string): void {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        for (const toast of state.toasts) {
          addToRemoveQueue(toast.id);
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === toastId || toastId === undefined ? { ...toast, open: false } : toast,
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }

      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };

    default:
      return state;
  }
}

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  for (const listener of listeners) {
    listener(memoryState);
  }
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast): {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
} {
  const id = genId();

  const update = (next: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...next, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismiss();
        }
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast(): {
  toasts: ToasterToast[];
  toast: typeof toast;
  dismiss: (toastId?: string) => void;
} {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch(toastId ? { type: "DISMISS_TOAST", toastId } : { type: "DISMISS_TOAST" }),
  };
}

export { useToast, toast };
