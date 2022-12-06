import React from 'react'
import Button from 'components/ButtonComponent'
import { useDispatch } from 'react-redux'
import { addQRCodeReadData } from 'slices/dashboardSlice'
import styles from 'styles/QRCodeReader.module.css'
type Props = {
    setReadData: React.Dispatch<React.SetStateAction<string>>
    setCameraDeviceModalOpen: React.Dispatch<React.SetStateAction<boolean>>
    setUseQrReader: React.Dispatch<React.SetStateAction<boolean>>
}

const QRCodeReader: React.VFC<Props> = ({
    setReadData,
    setCameraDeviceModalOpen,
    setUseQrReader,
}) => {
    const dispatch = useDispatch()
    return (
        <>
            <div>
                <Button
                    className={styles.select_camera_btn}
                    btnText={'カメラを選択'}
                    onClick={() => {
                        setCameraDeviceModalOpen(true)
                        setReadData('')
                        dispatch(addQRCodeReadData(''))
                    }}
                ></Button>
            </div>
            <Button
                className={styles.btn}
                btnText={'QRコード読み取り'}
                onClick={() => {
                    setUseQrReader(true)
                    setReadData('')
                    dispatch(addQRCodeReadData(''))
                }}
            ></Button>
        </>
    )
}

export default QRCodeReader
