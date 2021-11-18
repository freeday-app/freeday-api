// exécute tâches à la sortie de l'app
const Cleanup = {

    tasks: [],

    // ajoute tâche de nettoyage
    add(task) {
        Cleanup.tasks.push(task);
    }

};

// exécute tâches de nettoyage à la sortie de l'app
process.on('exit', () => {
    Cleanup.tasks.forEach((task) => {
        task();
    });
});

// bind toutes les méthodes de sorties
const processKill = () => {
    process.exit();
};
process.on('SIGINT', processKill);
process.on('SIGUSR1', processKill);
process.on('SIGUSR2', processKill);

module.exports = Cleanup;
