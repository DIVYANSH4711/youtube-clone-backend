const errorHandler = (err, req, res, next) => {
   let statusCode = err.statusCode || 500;
   let message = err.message || "Internal Server Error";
   let errors = err.errors || [];

   if (err instanceof ApiError) {
       statusCode = err.statusCode;
       message = err.message;
       errors = err.errors;
   }

   res.status(statusCode).json({
       success: false,
       message,
       errors,
       stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
   });
};

export { errorHandler };
