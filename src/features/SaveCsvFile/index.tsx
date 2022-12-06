import React from 'react'
import Button from 'components/ButtonComponent'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from 'store'
import { saveCsvFile } from 'services/qrReaderApi'
import { updateCanSaveFileState } from 'slices/dashboardSlice'
import styles from 'styles/QRCodeReader.module.css'


const SaveCsv: React.VFC = () => {
    const dispatch = useDispatch()
    const { readCodeData } = useSelector((state: RootState) => state.Dashboard)
    return (
        <Button
            className={styles.btn}
            btnText={'データ保存'}
            onClick={() => {
                dispatch(saveCsvFile(readCodeData))
                dispatch(updateCanSaveFileState(null))
            }}
            disabled={readCodeData ? false : true}
        ></Button>
    )
}

export default SaveCsv
