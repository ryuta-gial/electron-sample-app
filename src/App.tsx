import React from 'react'
import Content from 'pages/Dashboard'
import styles from './App.css'

function App() {
    return (
        <div className={styles.container}>
            <div className={styles.header}></div>
            <div className={styles.content}>
            <Content/>
            </div>
            <div className={styles.footer}></div>
        </div>
    )
}

export default App;