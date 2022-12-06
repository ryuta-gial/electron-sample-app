import React, { useEffect, useState } from 'react'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Select,
} from '@material-ui/core'
import { useDeviceId } from 'libs/cameraDeviceId'
import { createStyles, makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) =>
    createStyles({
        selectBox: {
            width: '100%',
        },
        reloadButtonWrapper: {
            marginTop: theme.spacing(1),
        },
    })
)

type Props = {
    open: boolean
    setOpen: (open: boolean) => void
    onChange: (deviceId: string) => void
}

const CameraDeviceSelectModal: React.VFC<Props> = ({
    open,
    setOpen,
    onChange,
}) => {
    const classes = useStyles()
    const [deviceId, setDeviceId] = useDeviceId()
    const [_deviceId, _setDeviceId] = useState(deviceId)
    const [deviceList, setDeviceList] = useState<MediaDeviceInfo[] | null>(null)

    const handleClose = () => {
        setOpen(false)
    }

    //接続されているデバイスを取得
    useEffect(() => {
        navigator.mediaDevices
            .enumerateDevices()
            .then((arr) => setDeviceList(arr))
    }, [])

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="form-dialog-title"
        >
            <DialogTitle id="form-dialog-title">
                カメラを選択してください。
            </DialogTitle>
            <DialogContent>
                {deviceList ? (
                    <Select
                        color="secondary"
                        value={_deviceId}
                        onChange={(
                            event: React.ChangeEvent<{ value: unknown }>
                        ) => {
                            _setDeviceId(event.target.value as string)
                        }}
                        className={classes.selectBox}
                    >
                        {deviceList
                            .filter((info) => info.kind === 'videoinput')
                            .map(({ label, deviceId }) => (
                                <MenuItem key={deviceId} value={deviceId}>
                                    {label || '(No name)'}
                                </MenuItem>
                            ))}
                    </Select>
                ) : (
                    <DialogContentText>読込中 ...</DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">
                    キャンセル
                </Button>
                <Button
                    onClick={() => {
                        handleClose()
                        setDeviceId(_deviceId)
                        onChange(_deviceId)
                    }}
                    color="secondary"
                >
                    決定
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default CameraDeviceSelectModal
