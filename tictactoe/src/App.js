import React, { useState } from 'react';
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

const sendArrayToServerGb = async (arrayData, setGbPrediction, endpoint) => {
  try {
    const response = await axios.post(`http://127.0.0.1:5000/${endpoint}`, arrayData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Resposta do servidor:', response.data);

    setGbPrediction((prevPredictions) => [...prevPredictions, response.data.prediction]);

    return response.data.prediction; // Retorna a predição
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
  setRealOutcome(status); // Define o resultado real do jogo
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

// Componente Board com lógica de jogo e destaque para a linha vencedora
const Board = ({ onNewGame, winnerCount, setKnnPrediction, setGbPrediction, setMlpPrediction, setRealOutcome }) => {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [gameStatus, setGameStatus] = useState(null);
  const [winningLine, setWinningLine] = useState([]);

  const handleClick = (i) => {
    const newSquares = squares.slice();
    if (gameStatus || squares[i]) return;

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
    sendGameStatus(newSquares, setRealOutcome);

    // Envia para os modelos de IA
    sendArrayToServer(arrayConvertedX, setKnnPrediction, '/models/knn');
    sendArrayToServerGb(arrayConvertedX, setGbPrediction, '/models/gb');
    sendArrayToServer(arrayConvertedX, setMlpPrediction, '/models/mlp');

    const { winner, line } = calculateWinner(newSquares);
    if (winner) {
      setGameStatus(`Winner: ${winner}`);
      setWinningLine(line);
      winnerCount(winner);
      return;
    }

    if (!newSquares.includes(null)) {
      setGameStatus('Draw');
      return;
    }

    // Jogada do computador (O)
    setTimeout(() => {
      const emptySquares = newSquares
        .map((value, index) => (value === null ? index : null))
        .filter(index => index !== null);

      if (emptySquares.length > 0) {
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

        // Envia para os modelos de IA
        sendArrayToServer(arrayConvertedX, setKnnPrediction, '/models/knn');
        sendArrayToServerGb(arrayConvertedX, setGbPrediction, '/models/gb');
        sendArrayToServer(arrayConvertedX, setMlpPrediction, '/models/mlp');

        const { winner, line } = calculateWinner(newSquares);
        if (winner) {
          setGameStatus(`Winner: ${winner}`);
          setWinningLine(line);
          winnerCount(winner);
        } else if (!newSquares.includes(null)) {
          setGameStatus('Draw');
        } else {
          setXIsNext(true);
        }
      }
    }, 1000);
  };

  const renderSquare = (i) => (
    <Square
      key={i}
      value={squares[i]}
      onClick={() => handleClick(i)}
      isWinning={winningLine.includes(i)}
    />
  );

  const handleRestart = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setGameStatus(null);
    setWinningLine([]);
  };

  const handleNewGame = () => {
    handleRestart();
    onNewGame();
  };

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
  const [realOutcome, setRealOutcome] = useState('');
  const [winCounts, setWinCounts] = useState({ X: 0, O: 0 });

  const handleWinnerCount = (winner) => {
    setWinCounts((prevCounts) => ({
      ...prevCounts,
      [winner]: prevCounts[winner] + 1,
    }));
  };

  const handleNewGame = () => {
    // Lógica para reiniciar ou preparar um novo jogo
  };

  return (
    <div className={styles.App}>
      <h1>Tic Tac Toe</h1>
      <Board
        onNewGame={handleNewGame}
        winnerCount={handleWinnerCount}
        setKnnPrediction={setKnnPrediction}
        setGbPrediction={setGbPrediction}
        setMlpPrediction={setMlpPrediction}
        setRealOutcome={setRealOutcome}
      />
      <div className={styles.scoreBoard}>
        <p>X Wins: {winCounts.X}</p>
        <p>O Wins: {winCounts.O}</p>
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
              <td>{realOutcome}</td>
            </tr>
            <tr>
              <td>Gradient Boosting</td>
              <td>{gbPrediction[gbPrediction.length - 1]}</td> {/* Exibe a última previsão do Gradient Boosting */}
              <td>{realOutcome}</td>
            </tr>
            <tr>
              <td>MLP</td>
              <td>{mlpPrediction}</td>
              <td>{realOutcome}</td>
            </tr>
             {/* Nova seção para exibir as classificações do GB */}
      <div className={styles.gbClassifications}>
        <h2>Classificações do Gradient Boosting</h2>
        <p>{gbPrediction.join(', ')}</p> {/* Exibe todas as classificações do GB */}
      </div>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
