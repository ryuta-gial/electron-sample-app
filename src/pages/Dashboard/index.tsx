import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addQRCodeReadData } from 'slices/dashboardSlice'
import { RootState } from 'store'
import styles from 'styles/Dashboard.module.css'
//component
import QRCodeReader from 'features/QRCodeReader'
import SaveCsv from 'features/SaveCsvFile'
import Button from 'components/ButtonComponent'
import DeviceSelectModal from 'components/DeviceSelectModal'
import { getDeviceIdFromStorage } from 'libs/cameraDeviceId'
//Third party
import { ToastContainer, toast, Flip } from 'react-toastify'
import { injectStyle } from 'react-toastify/dist/inject-style'
import QrReader from 'react-qr-reader'

const Dashboard: React.VFC = () => {
    const dispatch = useDispatch()
    const { canSaveCsvFile } = useSelector(
        (state: RootState) => state.Dashboard
    )
    const [useQrCodeReader, setUseQrReader] = useState<boolean>(false)
    const [readQrCodeData, setReadQrCodeData] = useState<string>('')
    const [cameraDeviceModalOpen, setCameraDeviceModalOpen] = useState(false)
    const [cameraDeviceId, setCameraDeviceId] = useState<string>(
        getDeviceIdFromStorage() || ''
    )
    const MemoizedToastContainer = React.memo(ToastContainer)
    const MemoizedQRCodeReader = React.memo(QRCodeReader)
    if (typeof window !== 'undefined') {
        injectStyle()
    }
    useEffect(() => {
        if (canSaveCsvFile === 'success') {
            toast('Start downloading csv files')
        } else if (canSaveCsvFile === 'error') {
            toast('Error make csv files')
        }
    }, [canSaveCsvFile])

    function handleScan(data: string | null) {
        if (data) {
            setReadQrCodeData(data)
            setUseQrReader(false)
            dispatch(addQRCodeReadData(data))
        }
    }
    function handleError(err: any) {
        console.error(err)
    }

    return (
        <>
            {useQrCodeReader ? (
                <>
                    <QrReader
                        style={{ width: '50%' }}
                        onError={handleError}
                        onScan={handleScan}
                        showViewFinder={false}
                        facingMode={'environment'}
                        constraints={{
                            deviceId: cameraDeviceId,
                            facingMode: 'environment',
                        }}
                    />
                    <p>
                        <Button
                            className={styles.close_btn}
                            btnText={'リーダーを閉じる'}
                            btnClose={true}
                            onClick={(
                                e: React.MouseEvent<
                                    HTMLButtonElement,
                                    MouseEvent
                                >
                            ) => setUseQrReader(false)}
                        ></Button>
                    </p>
                </>
            ) : (
                <>
                    <DeviceSelectModal
                        open={cameraDeviceModalOpen}
                        setOpen={setCameraDeviceModalOpen}
                        onChange={(deviceId) => {
                            setCameraDeviceId(deviceId)
                        }}
                    />
                    <div>
                        <MemoizedToastContainer
                            hideProgressBar={true}
                            autoClose={1000}
                            transition={Flip}
                        />
                        <MemoizedQRCodeReader
                            setReadData={setReadQrCodeData}
                            setCameraDeviceModalOpen={setCameraDeviceModalOpen}
                            setUseQrReader={setUseQrReader}
                        />
                        <SaveCsv />
                    </div>
                </>
            )}
            <p className={styles.read_data_title}>読み取ったQRコードのデータ</p>
            <p>
                <textarea
                    className={styles.text_area}
                    defaultValue={readQrCodeData ? readQrCodeData : ''}
                    disabled={true}
                />
            </p>
        </>
    )
}

export default Dashboard
