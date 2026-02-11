from flask import Flask, render_template, jsonify, request
import pyodbc
from datetime import datetime

# ==============================================================================
#   CONFIGURAÇÕES
# ==============================================================================

MODO_OFFLINE = False  

app = Flask(__name__)

DADOS_CONEXAO = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=FAC-DB53.facta.com.br;"
    "Database=Facta_01_BaseDados;"
    "Trusted_Connection=yes;"
    "ApplicationIntent=ReadOnly;"
)

# CORREÇÃO: lista ao invés de string para usar em queries parametrizadas
IDS_EQUIPE = [20269, 19515, 18676, 13424, 16329, 8176, 16786, 11496, 15166]

VIDEOS_RANK = {
    10: "ironVid", 15: "bronzeVid", 35: "goldVid", 70: "diamondVid",
    90: "misticoVid", 130: "masterVid", 190: "grandmasterVid",
    260: "legendVid", 350: "devilVid"
}

# ==============================================================================
#   MOCK DATA
# ==============================================================================
MOCK_PERFIL = {
    "nome": "Vitor supremo",
    "cargo": "Super Analista CEO Idoso",
    "total": 130,  
    "meta": 350
}

MOCK_LEADERBOARD = [
    {"nome": "Vitor supremo", "pontos": 929300},
    {"nome": "MARIA DEV", "pontos": 120},
    {"nome": "PEDRO MOSER", "pontos": 65},
    {"nome": "TESTE 4", "pontos": 40},
    {"nome": "Adrian Humilde", "pontos": -5000}
]

# ==============================================================================
#   LÓGICA
# ==============================================================================

def get_db_connection():
    """Cria e retorna uma conexão com o banco de dados."""
    return pyodbc.connect(DADOS_CONEXAO)

def calcular_elo_e_meta(qtd):
    """Calcula o elo e a próxima meta baseado na quantidade de chamados."""
    if qtd <= 9: return "unranked", 10
    elif qtd <= 14: return "iron", 15
    elif qtd <= 34: return "bronze", 35
    elif qtd <= 64: return "gold", 65
    elif qtd <= 89: return "diamond", 90
    elif qtd <= 129: return "mistico", 130
    elif qtd <= 189: return "master", 190
    elif qtd <= 259: return "grandmaster", 260
    elif qtd <= 349: return "legend", 350
    else: return "devil", 350

# ==============================================================================
#   ROTAS
# ==============================================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/perfil/<int:user_id>')
def get_perfil(user_id):
    """
    Retorna o perfil do usuário com nome, cargo, total de chamados, 
    elo atual e próxima meta.
    """
    if MODO_OFFLINE:
        nome = MOCK_PERFIL["nome"]
        cargo = MOCK_PERFIL["cargo"]
        total = MOCK_PERFIL["total"]
        elo, meta = calcular_elo_e_meta(total)
        return jsonify({
            "nome": nome, "cargo": cargo, "total": total, "meta": meta, "elo": elo,
            "video": VIDEOS_RANK.get(total, None)
        })

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # CORREÇÃO: uso de parâmetros (?) ao invés de f-string para prevenir SQL injection
        query = """
            SELECT F.NOME, FC.NOME, COUNT(PS.CODIGO) 
            FROM FL_FUNCIONARIO F 
            LEFT JOIN FL_CARGO FC ON F.CARGO = FC.CODIGO 
            LEFT JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel 
                AND PS.codStatus = 3 
                AND PS.data >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) 
            WHERE F.codigo = ? 
            GROUP BY F.NOME, FC.NOME
        """
        cursor.execute(query, (user_id,))
        res = cursor.fetchone()

        if res:
            nome = res[0]
            cargo = res[1] if res[1] else "Colaborador" 
            total = res[2]
            elo, meta = calcular_elo_e_meta(total)
            return jsonify({
                "nome": nome, "cargo": cargo, "total": total, "meta": meta, "elo": elo,
                "video": VIDEOS_RANK.get(total, None)
            })
        
        return jsonify({"error": "Usuário não encontrado"}), 404
        
    except Exception as e:
        app.logger.error(f"Erro ao buscar perfil do usuário {user_id}: {e}")
        return jsonify({"error": "Erro interno do servidor"}), 500
        
    finally:
        # CORREÇÃO: garantir que a conexão seja fechada mesmo em caso de erro
        if conn:
            conn.close()

@app.route('/api/leaderboard')
def get_leaderboard():
    """
    Retorna o ranking dos membros da equipe baseado no total de 
    chamados resolvidos no mês atual.
    """
    lista_final = []
    
    if MODO_OFFLINE:
        for item in MOCK_LEADERBOARD:
            elo, _ = calcular_elo_e_meta(item["pontos"])
            lista_final.append({"nome": item["nome"], "pontos": item["pontos"], "elo": elo})
        return jsonify(lista_final)

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # CORREÇÃO: uso de placeholders para a lista de IDs
        placeholders = ','.join('?' * len(IDS_EQUIPE))
        query = f"""
            SELECT F.NOME, COUNT(PS.CODIGO) 
            FROM FL_FUNCIONARIO F 
            LEFT JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel 
                AND PS.codStatus = 3 
                AND PS.data >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) 
            WHERE F.codigo IN ({placeholders}) 
            GROUP BY F.NOME 
            ORDER BY 2 DESC
        """
        cursor.execute(query, IDS_EQUIPE)
        rows = cursor.fetchall()
        
        for row in rows:
            elo, _ = calcular_elo_e_meta(row[1])
            lista_final.append({"nome": row[0], "pontos": row[1], "elo": elo})
        
        return jsonify(lista_final)
        
    except Exception as e:
        app.logger.error(f"Erro ao buscar leaderboard: {e}")
        return jsonify({"error": "Erro interno do servidor"}), 500
        
    finally:
        if conn:
            conn.close()

@app.route('/api/historico')
def get_historico():
    """
    Retorna o ranking histórico de um mês/ano específico.
    Parâmetros: ano, mes (via query string)
    """
    if MODO_OFFLINE:
        mock_hist = [
            {"nome": "LENDA PASSADA", "pontos": 300}, 
            {"nome": "ANTIGO CAMPEÃO", "pontos": 250}, 
            {"nome": "VETERANO", "pontos": 180}
        ]
        lista = []
        for item in mock_hist:
            elo, _ = calcular_elo_e_meta(item["pontos"])
            lista.append({"nome": item["nome"], "pontos": item["pontos"], "elo": elo})
        return jsonify(lista)

    ano = request.args.get('ano')
    mes = request.args.get('mes')
    
    if not ano or not mes:
        return jsonify({"error": "Parâmetros 'ano' e 'mes' são obrigatórios"}), 400
    
    # Validação básica dos parâmetros
    try:
        ano_int = int(ano)
        mes_int = int(mes)
        if not (2020 <= ano_int <= 2100):
            return jsonify({"error": "Ano inválido"}), 400
        if not (1 <= mes_int <= 12):
            return jsonify({"error": "Mês inválido"}), 400
    except ValueError:
        return jsonify({"error": "Parâmetros devem ser numéricos"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # CORREÇÃO: uso de placeholders para todos os parâmetros
        placeholders = ','.join('?' * len(IDS_EQUIPE))
        query = f"""
            SELECT F.NOME, COUNT(PS.CODIGO) 
            FROM FL_FUNCIONARIO F 
            JOIN PORTAL_SOLICITACAO PS ON F.codigo = PS.codResponsavel 
            WHERE PS.codStatus = 3 
                AND F.codigo IN ({placeholders}) 
                AND YEAR(PS.data) = ? 
                AND MONTH(PS.data) = ? 
            GROUP BY F.NOME 
            ORDER BY 2 DESC
        """
        # Combina os parâmetros: lista de IDs + ano + mes
        params = IDS_EQUIPE + [ano_int, mes_int]
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        lista = []
        for row in rows:
            elo, _ = calcular_elo_e_meta(row[1])
            lista.append({"nome": row[0], "pontos": row[1], "elo": elo})
        
        return jsonify(lista)
        
    except Exception as e:
        app.logger.error(f"Erro ao buscar histórico ({ano}/{mes}): {e}")
        return jsonify({"error": "Erro interno do servidor"}), 500
        
    finally:
        if conn:
            conn.close()

# ==============================================================================
#   EXECUÇÃO
# ==============================================================================

if __name__ == '__main__':
    if MODO_OFFLINE:
        # Modo desenvolvimento com live reload
        try:
            from livereload import Server
            server = Server(app.wsgi_app)
            server.serve(host='127.0.0.1', port=5000)
        except ImportError:
            print("⚠️  livereload não instalado. Usando servidor padrão do Flask.")
            app.run(debug=True, host='127.0.0.1', port=5000)
    else:
        # IMPORTANTE: Para produção, use um servidor WSGI adequado:
        # 
        # Opção 1 - Gunicorn (Linux/Mac):
        #   pip install gunicorn
        #   gunicorn -w 4 -b 0.0.0.0:5000 app:app
        #
        # Opção 2 - Waitress (Windows/multiplataforma):
        #   pip install waitress
        #   waitress-serve --host 0.0.0.0 --port 5000 app:app
        #
        # Opção 3 - uWSGI:
        #   pip install uwsgi
        #   uwsgi --http 0.0.0.0:5000 --wsgi-file app.py --callable app
        #
        # O código abaixo APENAS para testes rápidos em rede local:
        print("=" * 70)
        print("⚠️  ATENÇÃO: Usando servidor embutido do Flask")
        print("   Para PRODUÇÃO, utilize Gunicorn, Waitress ou uWSGI")
        print("   Exemplo: gunicorn -w 4 -b 0.0.0.0:5000 app:app")
        print("=" * 70)
        app.run(host='0.0.0.0', port=5000, debug=False)