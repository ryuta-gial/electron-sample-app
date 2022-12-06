import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    saveCsvFile
} from 'services/qrReaderApi';
import {
    initialState,
} from 'types/qrCodeReaderTypes';

export const DashboardSlice = createSlice({
    name: 'Dashboard',
    initialState,
    reducers: {
        addQRCodeReadData(state, action: PayloadAction<string>) {
            state.readCodeData = action.payload;
        },
        updateCanSaveFileState(state, action: PayloadAction<string|null>) {
            state.canSaveCsvFile = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(saveCsvFile.fulfilled, (state, action) => {
            return {
                ...state,
                canSaveCsvFile: action.payload,
            };
        });
    }
});

export const { addQRCodeReadData,updateCanSaveFileState } = DashboardSlice.actions;

export default DashboardSlice.reducer;
