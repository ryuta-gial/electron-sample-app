import { createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
const apiUrl = 'http://localhost:3000/api/v1'

export const saveCsvFile = createAsyncThunk(
    'qrData/post',
    async (arg: string | null) => {
        try {
            const response = await axios
                .post<Blob>(`${apiUrl}/csv`, {
                    qrReaderData: arg,
                })
                .then((response) => {
                    if (response.status === 200) {
                        let bom = new Uint8Array([0xef, 0xbb, 0xbf])
                        const url = window.URL.createObjectURL(
                            new Blob([bom, response.data], {
                                type: 'text/csv',
                            })
                        )
                        const fileName = response.headers[
                            'content-disposition'
                        ].replace(/attachment; filename="(.*)"/u, '$1')
                        const link = document.createElement('a')
                        link.href = url
                        link.setAttribute('download', fileName)
                        document.body.appendChild(link)
                        setTimeout(() => {
                            link.click()
                        }, 10)
                        return 'success'
                    } else {
                        return 'error'
                    }
                })
                .catch((err) => {
                    console.error(err)
                    return 'error'
                })
            return response
        } catch (err:any) {
            return err.response
        }
    }
)
