## IDEE IMPLEMENTAZIONI



* Salvare gpx nel backend, associarlo al trek specifico FATTO
* Calcolare dal gpx durata e altitudine (realizzarne un grafico?)
* 1. Se rimuovo lat/lon da Trek, come mostro trek sulla mappa senza caricare il GPX? TrekMap e TrekList usano lat/lon per posizionare il marker. Tre opzioni:

1. Estrai e salvi un "punto rappresentativo" 
Elimini completamente la mappa dalla lista trek??

2. Atomicità: creare Trek + caricare GPX in un'unica transazione
Oggi sono due endpoint separati. Se l'upload GPX fallisce dopo la creazione del trek, hai un trek orfano senza traccia. Valutare se fare tutto in un'unica POST multipart che accetta sia i metadati del trek che il file GPX.

3. Il campo title su TrekGpx è ridondante con il title del Trek







