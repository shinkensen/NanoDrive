import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Main from './pages/Main';
import { useState } from 'react';
export default function Home(){
    let [authState,setAuthState] = useState(false);
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/"></Route>
            <Route path="/main" element={<Main authState={authState} setAuthState={setAuthState}/>}/>
        </Routes>
        </BrowserRouter>

    )
}