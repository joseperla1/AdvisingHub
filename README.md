# AdvisingHub
Queue System for Student to connect with Academic Advisors

login credentials to view the changes between different users and admin views:
admins :
email: 'admin@example.com'
password: password



users:
email: 'john.smith@student.edu'
password: password

email: 'ariana.m@student.edu'
password: password


to run the backend:
npm run dev
When testing different features of the website such as going through the queue refreshing does not repopulate the queues you must restar the back end server either completely or typing (rs) in the terminal when the backend is runnning this refreshes the page with the mocked objects from the front end. 
Some changes stay as long as the server is running for example creating an appointment from the user side and then switching to the admin side will allow that new appointment to persist, however if the backend serve is restarted it will disappear since its only saved in temp storage while the backend runs this is by design until a persistant data storage is implemented.

to run the frontend:
ng serve

