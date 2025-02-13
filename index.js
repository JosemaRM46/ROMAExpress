const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();
const port = process.env.DB_PORT;
const app = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000', 'https://z2nxvq18-3000.use2.devtunnels.ms'],
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});



// Endpoint para agregar un producto
app.post('/api/productos', (req, res) => {
  const { nombre, idCategoria } = req.body;

  // Validación básica
  if (!nombre || !idCategoria) {
    return res.status(400).json({ error: 'El nombre y la categoría son necesarios' });
  }

  // Consulta SQL para insertar un producto en la base de datos
  const query = `
    INSERT INTO Producto (nombre, idCategoria)
    VALUES (?, ?)`;

  db.query(query, [nombre, idCategoria], (err, result) => {
    if (err) {
      console.error('Error al agregar producto:', err);
      return res.status(500).json({ error: 'Error al agregar producto' });
    }
    res.status(201).json({ message: 'Producto agregado exitosamente', id: result.insertId });
  });
});



// Obtener productos
app.get('/api/productos', (req, res) => {
  const query = 'SELECT * FROM Producto'; // Asegúrate de que "Producto" exista en tu base de datos

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener los productos:', err);
      return res.status(500).json({ error: 'Error al obtener los productos' });
    }
    res.status(200).json(result);
  });
});


// Endpoint para obtener todas las categorías
app.get('/api/categorias', (req, res) => {
  const query = 'SELECT * FROM Categoria';

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener las categorías:', err);
      return res.status(500).json({ error: 'Error al obtener las categorías' });
    }
    res.status(200).json(result);
  });
});


app.post('/api/agregarProducto', (req, res) => {
  const { idProducto, idColor, idTalla, cantidad, precioCompra, idProveedor } = req.body;

  // Validación del idProveedor
  if (!idProveedor) {
    return res.status(400).json({ error: 'El proveedor es obligatorio' });
  }

  // Insertar el movimiento en la tabla Movimiento_Producto
  const queryMovimiento = `
    INSERT INTO Movimiento_Producto (idProducto, idColor, idTalla, cantidad, precioCompra, tipoMovimiento)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(queryMovimiento, [idProducto, idColor, idTalla, cantidad, precioCompra, 'Ingreso'], (err, result) => {
    if (err) {
      console.error('Error al agregar producto al inventario:', err);
      return res.status(500).json({ error: 'Error al agregar producto al inventario' });
    }

    // Actualizar la cantidad de inventario
    const queryInventario = `
      INSERT INTO Inventario (idProducto, idColor, idTalla, cantidad)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE cantidad = cantidad + ?;
    `;
    db.query(queryInventario, [idProducto, idColor, idTalla, cantidad, cantidad], (err, result) => {
      if (err) {
        console.error('Error al actualizar inventario:', err);
        return res.status(500).json({ error: 'Error al actualizar inventario' });
      }

      // Insertar en la tabla Producto_Proveedor para registrar la relación entre producto y proveedor
      const queryProductoProveedor = `
        INSERT INTO Producto_Proveedor (idProducto, idProveedor)
        VALUES (?, ?)
      `;
      db.query(queryProductoProveedor, [idProducto, idProveedor], (err, result) => {
        if (err) {
          console.error('Error al asociar el proveedor con el producto:', err);
          return res.status(500).json({ error: 'Error al asociar el proveedor con el producto' });
        }

        // Insertar en la tabla Historial_Precios
        const queryHistorialPrecios = `
          INSERT INTO Historial_Precios (idProducto, precio, idProveedor)
          VALUES (?, ?, ?)
        `;
        db.query(queryHistorialPrecios, [idProducto, precioCompra, idProveedor], (err, result) => {
          if (err) {
            console.error('Error al actualizar el historial de precios:', err);
            return res.status(500).json({ error: 'Error al actualizar el historial de precios' });
          }

          res.status(200).json({ message: 'Producto agregado al inventario, asociado con el proveedor, y actualizado en el historial de precios exitosamente' });
        });
      });
    });
  });
});






app.post('/api/quitarProducto', (req, res) => {
  const { idProducto, idColor, idTalla, cantidad } = req.body;

  // Insertar el movimiento en la tabla Movimiento_Producto
  const queryMovimiento = 'INSERT INTO Movimiento_Producto (idProducto, idColor, idTalla, cantidad, tipoMovimiento) VALUES (?, ?, ?, ?, ?)';
  db.query(queryMovimiento, [idProducto, idColor, idTalla, cantidad, 'Salida'], (err, result) => {
    if (err) {
      console.error('Error al quitar producto del inventario:', err);
      return res.status(500).json({ error: 'Error al quitar producto del inventario' });
    }

    // Actualizar la cantidad de inventario después de quitar el producto
    const queryInventario = `
      UPDATE Inventario
      SET cantidad = cantidad - ?
      WHERE idProducto = ? AND idColor = ? AND idTalla = ?;
    `;
    db.query(queryInventario, [cantidad, idProducto, idColor, idTalla], (err, result) => {
      if (err) {
        console.error('Error al actualizar inventario:', err);
        return res.status(500).json({ error: 'Error al actualizar inventario' });
      }
      res.status(200).json({ message: 'Producto quitado del inventario exitosamente' });
    });
  });
});


// Ruta para obtener los colores
app.get('/api/colores', (req, res) => {
  const query = 'SELECT * FROM Color';

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener colores:', err);
      return res.status(500).json({ error: 'Error al obtener colores' });
    }
    res.status(200).json(result);
  });
});

// Ruta para obtener las tallas
app.get('/api/tallas', (req, res) => {
  const query = 'SELECT * FROM Talla';

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener tallas:', err);
      return res.status(500).json({ error: 'Error al obtener tallas' });
    }
    res.status(200).json(result);
  });
});



app.get('/api/inventario', (req, res) => {
  const query = `
    SELECT 
        i.idProducto,
        p.nombre AS producto,
        IFNULL(c.nombre, 'Sin color') AS color,
        IFNULL(t.nombre, 'Sin talla') AS talla,
        i.cantidad
    FROM Inventario i
    INNER JOIN Producto p ON i.idProducto = p.idProducto
    LEFT JOIN Color c ON i.idColor = c.idColor
    LEFT JOIN Talla t ON i.idTalla = t.idTalla
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener inventario:', err);
      return res.status(500).json({ error: 'Error al obtener inventario' });
    }
    res.status(200).json(result);
  });
});


app.get('/api/proveedores', (req, res) => {
  const query = 'SELECT * FROM Proveedor';

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener proveedores:', err);
      return res.status(500).json({ error: 'Error al obtener proveedores' });
    }
    res.status(200).json(result);
  });
});

app.post('/api/proveedores', (req, res) => {
  const { nombre, telefono } = req.body;

  // Validación básica
  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Todos los campos son necesarios' });
  }

  // Consulta SQL para insertar un proveedor en la base de datos
  const query = `
    INSERT INTO Proveedor (nombre, telefono)
    VALUES (?, ?)
  `;

  db.query(query, [nombre, telefono], (err, result) => {
    if (err) {
      console.error('Error al agregar proveedor:', err);
      return res.status(500).json({ error: 'Error al agregar proveedor' });
    }
    res.status(201).json({ message: 'Proveedor agregado exitosamente', id: result.insertId });
  });
});


// Ruta para agregar un color
app.post('/api/color', (req, res) => {
  const { nombre } = req.body;

  const query = `INSERT INTO Color (nombre) VALUES (?)`;

  db.query(query, [nombre], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Error al agregar el color' });
    } else {
      res.status(200).json({ mensaje: 'Color agregado exitosamente' });
    }
  });
});

// Ruta para agregar una talla
app.post('/api/talla', (req, res) => {
  const { nombre } = req.body;

  const query = `INSERT INTO Talla (nombre) VALUES (?)`;

  db.query(query, [nombre], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Error al agregar la talla' });
    } else {
      res.status(200).json({ mensaje: 'Talla agregada exitosamente' });
    }
  });
});


app.get('/api/historial-precios/:productoId', (req, res) => {
  const productoId = req.params.productoId;

  // Consulta modificada para excluir los movimientos de tipo 'Salida'
  const query = `
    SELECT m.precioCompra, m.fecha, p.nombre 
    FROM Movimiento_Producto m
    JOIN Producto p ON m.idProducto = p.idProducto
    WHERE m.idProducto = ? AND m.tipoMovimiento = 'Ingreso'
    ORDER BY m.fecha DESC;
  `;

  db.query(query, [productoId], (err, result) => {
    if (err) {
      console.error('Error al obtener historial de precios:', err);
      return res.status(500).json({ error: 'Error al obtener historial de precios' });
    }
    res.status(200).json(result);
  });
});




// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
