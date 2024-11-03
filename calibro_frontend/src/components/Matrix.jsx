import { useEffect, useState } from "react";

const Matrix = ({mat, n, m, vector = false})=>{
    const [newmat, setMat] = useState([])
    useEffect(()=>{
        const temp = []
        if(vector){
            const line = []
            for(var i = 0; i < m; i++){
                line.push(mat[i])
            }
            temp.push(line)
        }else{
            for(var i = 0; i < n; i++){
                const line = []
                for(var j = 0; j < m; j++){
                    line.push(mat[i][j])
                }
                temp.push(line)
            }
        }
        setMat(temp)
    }, [])
    return <table className="table">
        <tbody>
            {   
                newmat.map((line, i)=>{
                    return <tr key = {i}>
                        {
                            line.map((e, j)=>{
                                e = parseInt(e * 100)/100
                                return <td key={i *100 + j}>{e}</td>
                            })
                        }
                    </tr>
                })
            }
        </tbody>
    </table>
}

export default Matrix;

