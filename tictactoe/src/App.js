import React, { useState, useEffect } from 'react';
import styles from './App.module.css';
import axios from 'axios';


// Função que envia o estado do tabuleiro para o servidor
const sendArrayToServer = async (arrayData, setPrediction, endpoint) => {
  try {
    const response = await axios.post(`http://127.0.0.1:5000/${endpoint}`, arrayData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Resposta do servidor:', response.data);
    setPrediction(response.data.prediction);
    return response.data.prediction; // Retorna a predição
  } catch (error) {
    console.error('Erro ao enviar o array:', error);
  }
};

const sendArrayToServerGb = async (arrayData, setGbPrediction, endpoint, setIsGameOver, setGameStatus, handleRestart) => {
  try {
    const response = await axios.post(`http://127.0.0.1:5000/${endpoint}`, arrayData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Resposta do servidor:', response.data);
    
    const prediction = response.data.prediction;

    // Armazena a predição
    setGbPrediction((prevPredictions) => [...prevPredictions, prediction]);

    // Verifica se a predição é de vitória ou empate e reinicia o jogo se for o caso
    // Converte prediction para string (caso não seja) e verifica se a predição é de vitória ou empate
    if (String(prediction) === 'x ganha' || String(prediction) === 'o ganha' || String(prediction) === 'empate') {
      setIsGameOver(true); // Define o jogo como encerrado
      setGameStatus(prediction); // Atualiza o status do jogo
      // Chama o reinício do jogo após um breve intervalo
      setTimeout(() => {
        handleRestart();
      }); // Tempo de 2 segundos antes de reiniciar o jogo para dar um feedback visual
    }

    return prediction; // Retorna a predição
  } catch (error) {
    console.error('Erro ao enviar o array:', error);
  }
};

// Função para enviar o status do jogo ao servidor
const sendGameStatus = (squares, setRealOutcome) => {
  const winnerData = calculateWinner(squares);
  let status;
  if (winnerData.winner) {
    status = `${winnerData.winner.toLowerCase()} ganha`;
  } else if (!squares.includes(null)) {
    status = 'empate';
  } else {
    status = 'tem jogo';
  }
  
  // Atualiza o estado de resultados reais, armazenando todos os resultados
  setRealOutcome((prevOutcomes) => [...prevOutcomes, status]); // Armazena todos os resultados
  
  return status;
};

// Função que calcula o vencedor
const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: [] };
};

// Componente Square com destaque para os quadrados vencedores
const Square = ({ value, onClick, isWinning }) => (
  <button
    className={`${styles.square} ${isWinning ? styles.winningSquare : ''}`}
    onClick={onClick}
  >
    {value}
  </button>
);

const Board = ({ onNewGame, setKnnPrediction, setGbPrediction, setMlpPrediction, setRealOutcome, updateAccuracy }) => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameStatus, setGameStatus] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false); // Novo estado para controlar o fim do jogo

  const handleClick = (i) => {
    if (isGameOver || squares[i]) return; // Impede novas jogadas se o jogo acabou ou a casa já foi clicada
  
    const newSquares = squares.slice();
    newSquares[i] = 'X';
    setSquares(newSquares);
    setXIsNext(false);
  
    const arrayConvertedX = newSquares.map(value =>
      value === null ? 0 :
      value === "X" ? 1 :
      value === "O" ? -1 :
      value
    );
  
    // Atualiza o status do jogo com o resultado correto
    const gameStatus = sendGameStatus(newSquares, setRealOutcome);
  
    // Verifica se o jogo acabou antes de enviar para os modelos
    if (!isGameOver) {
      // Envia para os modelos de IA
      sendArrayToServer(arrayConvertedX, setKnnPrediction, '/models/knn');
      sendArrayToServerGb(arrayConvertedX, setGbPrediction, '/models/gb', setIsGameOver, setGameStatus, handleRestart);
      sendArrayToServer(arrayConvertedX, setMlpPrediction, '/models/mlp');
    }
  
    // Jogada do computador (O) - só ocorre se o jogo não estiver terminado
    if (!isGameOver && gameStatus === 'tem jogo') {
      setTimeout(() => {
        const emptySquares = newSquares
          .map((value, index) => (value === null ? index : null))
          .filter(index => index !== null);
  
        if (emptySquares.length > 0 && !isGameOver) {
          const randomIndex = Math.floor(Math.random() * emptySquares.length);
          const oMove = emptySquares[randomIndex];
          newSquares[oMove] = 'O';
          setSquares(newSquares);
  
          const arrayConvertedO = newSquares.map(value =>
            value === null ? 0 :
            value === "X" ? 1 :
            value === "O" ? -1 :
            value
          );
  
          // Atualiza o status do jogo com o resultado correto
          sendGameStatus(newSquares, setRealOutcome);
  
          // Verifica se o jogo acabou antes de enviar para os modelos novamente
          if (!isGameOver) {
            sendArrayToServer(arrayConvertedO, setKnnPrediction, '/models/knn');
            sendArrayToServerGb(arrayConvertedO, setGbPrediction, '/models/gb', setIsGameOver, setGameStatus, handleRestart);
            sendArrayToServer(arrayConvertedO, setMlpPrediction, '/models/mlp');
          }
        }
      }, 1000);
    }
  };
  
  const handleRestart = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameStatus(null);
    setWinningLine([]);
    setIsGameOver(false); // Reinicia o estado do jogo
  };

  const handleNewGame = () => {
    handleRestart();
    onNewGame();
  };


  const renderSquare = (i) => (
    <Square
      key={i}
      value={squares[i]}
      onClick={() => handleClick(i)}
      isWinning={winningLine.includes(i)}
    />
  );

  return (
    <div>
      <div className={styles.status}>{gameStatus || `Next player: ${xIsNext ? 'X' : 'O'}`}</div>
      <div className={styles.boardRow}>
        {renderSquare(0)}
        {renderSquare(1)}
        {renderSquare(2)}
      </div>
      <div className={styles.boardRow}>
        {renderSquare(3)}
        {renderSquare(4)}
        {renderSquare(5)}
      </div>
      <div className={styles.boardRow}>
        {renderSquare(6)}
        {renderSquare(7)}
        {renderSquare(8)}
      </div>
      <button className={styles.restartButton} onClick={handleRestart}>
        Recomeçar
      </button>
      {gameStatus && (
        <button className={styles.newGameButton} onClick={handleNewGame}>
          Começar Outra Partida
        </button>
      )}
    </div>
  );
};

function App() {  
  const [accuracy, setAccuracy] = useState(0); // Para armazenar a acurácia
  const [knnPrediction, setKnnPrediction] = useState('');
  const [gbPrediction, setGbPrediction] = useState([]); // Inicializa como um array vazio
  const [mlpPrediction, setMlpPrediction] = useState(''); 
  const [realOutcome, setRealOutcome] = useState([]);

  const handleNewGame = () => {
    // Lógica para reiniciar ou preparar um novo jogo
  };

  // useEffect para calcular a acurácia quando os resultados reais ou as predições mudarem
  useEffect(() => {
    const updateAccuracy = () => {
      const totalOutcomes = realOutcome.length;

      // Verifica se os arrays têm o mesmo comprimento
      if (totalOutcomes === gbPrediction.length && totalOutcomes > 0) {
        let correctPredictions = 0;

        // Loop para contar predições corretas
        for (let i = 0; i < totalOutcomes; i++) {
          const realValue = String(realOutcome[i]).trim(); // Normaliza o valor real
          const predictedValue = String(gbPrediction[i]).trim(); // Normaliza a predição

          console.log(`Comparando real: "${realValue}" com predição: "${predictedValue}"`);

          if (realValue === predictedValue) {
            correctPredictions++;
          }
        }

        // Cálculo da acurácia
        const accuracy = (correctPredictions / totalOutcomes) * 100;
        setAccuracy(accuracy); // Atualiza a acurácia
        console.log(`Esse é o total de acurácia: ${accuracy.toFixed(2)}%`);
        
        console.log(`Número total de resultados: ${totalOutcomes}`);
        console.log(`Esse é o array de resultados reais: ${realOutcome}`);
        console.log(`Esse é o array de predições: ${gbPrediction}`);
        
      } else {
        console.error('Os arrays de resultados reais e predições têm comprimentos diferentes ou estão vazios!');
      }
    };

    // Chama a função de atualização de acurácia
    updateAccuracy();
  }, [realOutcome, gbPrediction]);

  return (
    <div className={styles.App}>
      <h1>Tic Tac Toe</h1>
      <Board
        onNewGame={handleNewGame}
        setKnnPrediction={setKnnPrediction}
        setGbPrediction={setGbPrediction}
        setMlpPrediction={setMlpPrediction}
        setRealOutcome={setRealOutcome} 
        // updateAccuracy={updateAccuracy}
      />
      <div className={styles.scoreBoard}>
        <p> Acurácia do Gradient Booster {accuracy.toFixed(2)}%</p>
        <table className={styles.predictionTable}>
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Predição</th>
              <th>Resultado Real</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>KNN</td>
              <td>{knnPrediction}</td>
              <td>{realOutcome[realOutcome.length -1 ]}</td>
            </tr>
            <tr>
              <td>Gradient Boosting</td>
              <td>{gbPrediction[gbPrediction.length - 1]}</td> {/* Exibe a última previsão do Gradient Boosting */}
              <td>{realOutcome[realOutcome.length -1 ]}</td>
            </tr>
            <tr>
              <td>MLP</td>
              <td>{mlpPrediction}</td>
              <td>{realOutcome[realOutcome.length -1 ]}</td>
            </tr>
             {/* Nova seção para exibir as classificações do GB */}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
