import {
    combineReducers,
    configureStore,
    ThunkAction,
    Action,
    getDefaultMiddleware,
    Reducer,
    AnyAction,
} from '@reduxjs/toolkit';
import Dashboard_Reducer from 'slices/dashboardSlice';

//すべてのステートをまとめる
const appReducer = combineReducers({
    Dashboard: Dashboard_Reducer,
});

export type RootState = ReturnType<typeof appReducer>;

const rootReducer: Reducer = (state: RootState, action: AnyAction) => {
    return appReducer(state, action);
};

const store = configureStore({
    reducer: rootReducer,
    middleware: [...getDefaultMiddleware()],
});

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
>;

export default store;
