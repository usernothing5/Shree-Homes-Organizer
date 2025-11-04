// FIX: Import Dispatch and SetStateAction to resolve namespace error.
import { useState, useCallback, useMemo, Dispatch, SetStateAction } from 'react';

// This hook manages state that persists in localStorage but requires an explicit save action.
// It tracks if the in-memory state differs from the last saved state.
export function usePersistentState<T>(
    key: string,
    initialValue: T
// FIX: Use imported Dispatch and SetStateAction types directly instead of React.Dispatch.
): [T, Dispatch<SetStateAction<T>>, boolean, () => void] {
    
    // The last state that was successfully saved to localStorage.
    const [lastSavedState, setLastSavedState] = useState<T>(() => {
        if (typeof window === "undefined") return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });
    
    // The current in-memory state, which may have unsaved changes.
    const [currentState, setCurrentState] = useState<T>(lastSavedState);

    // A memoized boolean that is true if the current state differs from the last saved state.
    const isDirty = useMemo(() => JSON.stringify(currentState) !== JSON.stringify(lastSavedState), [currentState, lastSavedState]);

    // A callback to write the current in-memory state to localStorage.
    const saveState = useCallback(() => {
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(key, JSON.stringify(currentState));
                // After saving, update the lastSavedState to match the current state,
                // which will set isDirty to false.
                setLastSavedState(currentState); 
            } catch (error) {
                console.error(`Error writing to localStorage key “${key}”:`, error);
            }
        }
    }, [key, currentState]);
    
    // Returns the current state, a setter for it, the dirty flag, and the save function.
    return [currentState, setCurrentState, isDirty, saveState];
}
